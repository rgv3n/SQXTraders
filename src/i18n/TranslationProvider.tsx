/// <reference types="vite/client" />
import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
    LOCAL_TRANSLATIONS,
    SUPPORTED_LANGUAGES,
    type SupportedLanguage,
} from './localTranslations';

// ============================================================
// Types
// ============================================================
type TranslationsMap = Record<string, string>; // key -> content

interface TranslationState {
    language: string;
    translations: TranslationsMap;
    availableLanguages: string[];
    loading: boolean;
    error: string | null;
}

type TranslationAction =
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_LANGUAGE'; payload: string }
    | { type: 'SET_TRANSLATIONS'; payload: TranslationsMap }
    | { type: 'SET_AVAILABLE_LANGUAGES'; payload: string[] }
    | { type: 'SET_ERROR'; payload: string | null };

interface TranslationContextValue extends TranslationState {
    t: (key: string, fallback?: string) => string;
    setLanguage: (lang: string) => Promise<void>;
    refreshTranslations: () => Promise<void>;
}

// ============================================================
// Context
// ============================================================
const TranslationContext = createContext<TranslationContextValue | null>(null);

// ============================================================
// Reducer
// ============================================================
function reducer(state: TranslationState, action: TranslationAction): TranslationState {
    switch (action.type) {
        case 'SET_LOADING':
            return { ...state, loading: action.payload };
        case 'SET_LANGUAGE':
            return { ...state, language: action.payload };
        case 'SET_TRANSLATIONS':
            return { ...state, translations: action.payload, loading: false, error: null };
        case 'SET_AVAILABLE_LANGUAGES':
            return { ...state, availableLanguages: action.payload };
        case 'SET_ERROR':
            return { ...state, error: action.payload, loading: false };
        default:
            return state;
    }
}

const STORAGE_KEY = 'eventos_language';
const DEFAULT_LANGUAGE = import.meta.env.VITE_DEFAULT_LANGUAGE || 'es';

/** Returns the local dictionary for the given language, defaulting to ES */
function getLocalDict(lang: string): TranslationsMap {
    return (
        LOCAL_TRANSLATIONS[lang as SupportedLanguage] ??
        LOCAL_TRANSLATIONS['es']
    );
}

// ============================================================
// Provider
// ============================================================
export function TranslationProvider({ children }: { children: React.ReactNode }) {
    const storedLang = localStorage.getItem(STORAGE_KEY) ?? DEFAULT_LANGUAGE;

    // Seed initial translations from the local dictionary so the UI
    // is already translated before (or if) Supabase responds.
    const [state, dispatch] = useReducer(reducer, {
        language: storedLang,
        translations: getLocalDict(storedLang),
        availableLanguages: SUPPORTED_LANGUAGES.map((l) => l.code),
        loading: Boolean(isSupabaseConfigured), // only show spinner if DB is expected
        error: null,
    });

    const loadTranslations = useCallback(async (lang: string) => {
        // Always start with the local dictionary for instant display
        const localDict = getLocalDict(lang);
        dispatch({ type: 'SET_TRANSLATIONS', payload: localDict });

        // If Supabase is not properly configured, stop here
        if (!isSupabaseConfigured) {
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
        }

        dispatch({ type: 'SET_LOADING', payload: true });
        try {
            const { data, error } = await supabase
                .from('text_translations')
                .select('content, text_objects(key)')
                .eq('language_code', lang);

            if (error) throw error;

            // Merge: local dict is the base, Supabase values override
            const remote: TranslationsMap = {};
            if (data) {
                for (const row of (data as unknown) as Array<{
                    content: string;
                    text_objects: { key: string } | null;
                }>) {
                    if (row.text_objects?.key) {
                        remote[row.text_objects.key] = row.content;
                    }
                }
            }

            dispatch({
                type: 'SET_TRANSLATIONS',
                payload: { ...localDict, ...remote },
            });

            // Load available languages from DB (fallback to SUPPORTED_LANGUAGES)
            const { data: langs } = await supabase
                .from('text_translations')
                .select('language_code')
                .order('language_code');

            if (langs && langs.length > 0) {
                const unique = [
                    ...new Set(langs.map((l: { language_code: string }) => l.language_code)),
                ];
                dispatch({ type: 'SET_AVAILABLE_LANGUAGES', payload: unique });
            }
        } catch (_err) {
            // Supabase failed — the local dict is already loaded, so just log
            console.warn('[EventOS] Could not load translations from Supabase. Using local fallback.');
            dispatch({ type: 'SET_LOADING', payload: false });
        }
    }, []);

    useEffect(() => {
        loadTranslations(state.language);
    }, [state.language, loadTranslations]);

    const setLanguage = useCallback(async (lang: string) => {
        localStorage.setItem(STORAGE_KEY, lang);
        dispatch({ type: 'SET_LANGUAGE', payload: lang });
    }, []);

    /**
     * Translation lookup.
     * Priority: Supabase DB > local dictionary > inline fallback > [key]
     */
    const t = useCallback(
        (key: string, fallback?: string): string => {
            return state.translations[key] ?? fallback ?? `[${key}]`;
        },
        [state.translations]
    );

    const refreshTranslations = useCallback(async () => {
        await loadTranslations(state.language);
    }, [loadTranslations, state.language]);

    return (
        <TranslationContext.Provider
            value={{ ...state, t, setLanguage, refreshTranslations }}
        >
            {children}
        </TranslationContext.Provider>
    );
}

// ============================================================
// Hook
// ============================================================
export function useTranslation(): TranslationContextValue {
    const ctx = useContext(TranslationContext);
    if (!ctx) throw new Error('useTranslation must be used within TranslationProvider');
    return ctx;
}
