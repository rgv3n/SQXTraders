import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

interface ImageUploadProps {
    value: string | null;
    onChange: (url: string | null) => void;
    bucket?: string;
    label?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
    value,
    onChange,
    bucket = 'speakers',
    label = 'Foto'
}) => {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const file = event.target.files?.[0];
            if (!file) return;

            // Validate file type
            if (!file.type.startsWith('image/')) {
                toast.error('Por favor, selecciona una imagen válida.');
                return;
            }

            // Validate file size (max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                toast.error('La imagen es demasiado grande (máximo 2MB).');
                return;
            }

            setUploading(true);

            // Generate a unique filename
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Upload the file to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            // Get the public URL
            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath);

            onChange(publicUrl);
            toast.success('Imagen subida correctamente.');
        } catch (error: any) {
            console.error('Error uploading image:', error);
            toast.error(`Error al subir la imagen: ${error.message}`);
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const removeImage = () => {
        onChange(null);
    };

    return (
        <div style={{ marginBottom: 'var(--space-4)' }}>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 8 }}>
                {label}
            </label>

            <div style={{
                border: '2px dashed var(--color-surface-muted)',
                borderRadius: 8,
                padding: 'var(--space-4)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--space-4)',
                background: 'var(--color-surface-dark)',
                position: 'relative',
                minHeight: 120,
                justifyContent: 'center'
            }}>
                {value ? (
                    <div style={{ position: 'relative', width: '100%', maxWidth: 200 }}>
                        <img
                            src={value}
                            alt="Preview"
                            style={{
                                width: '100%',
                                height: 'auto',
                                borderRadius: 4,
                                border: '1px solid var(--color-surface-muted)'
                            }}
                        />
                        <button
                            onClick={removeImage}
                            style={{
                                position: 'absolute',
                                top: -10,
                                right: -10,
                                background: 'var(--color-error)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: 24,
                                height: 24,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }}
                            title="Eliminar imagen"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ) : (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            cursor: 'pointer',
                            color: 'var(--color-text-muted)',
                            textAlign: 'center'
                        }}
                    >
                        {uploading ? (
                            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-gold)' }} />
                        ) : (
                            <Upload size={32} />
                        )}
                        <p style={{ marginTop: 8, fontSize: 'var(--text-sm)' }}>
                            {uploading ? 'Subiendo...' : 'Haz clic para subir o arrastra una imagen'}
                        </p>
                        <p style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>
                            PNG, JPG hasta 2MB
                        </p>
                    </div>
                )}

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                />
            </div>

            {value && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ImageIcon size={14} style={{ color: 'var(--color-text-muted)' }} />
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                        {value}
                    </span>
                </div>
            )}
        </div>
    );
};
