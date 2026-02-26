import { useState } from 'react';
import { Download, Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from '@/i18n/TranslationProvider';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import Papa from 'papaparse';

export default function AdminImportExportPage() {
    const { t } = useTranslation();
    const [isExporting, setIsExporting] = useState<string | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importResults, setImportResults] = useState<{ success: number; failed: number } | null>(null);

    // --- EXPORT LOGIC ---
    const handleExport = async (table: string) => {
        setIsExporting(table);
        try {
            const { data, error } = await supabase.from(table).select('*');
            if (error) throw error;

            if (!data || data.length === 0) {
                toast.error('No hay datos para exportar');
                return;
            }

            const csv = Papa.unparse(data);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${table}_export_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success(`Exportación de ${table} completada`);
        } catch (error: any) {
            toast.error(`Error al exportar: ${error.message}`);
        } finally {
            setIsExporting(null);
        }
    };

    // --- IMPORT LOGIC ---
    const handleImportAttendees = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        setImportResults(null);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results: Papa.ParseResult<any>) => {
                const rows = results.data as any[];
                let successCount = 0;
                let failCount = 0;

                // Simple validation and batch import
                // We need an event_id to associate attendees with. 
                // For now, let's try to find at least one event or ask the user (MVP logic)
                const { data: events } = await supabase.from('events').select('id').limit(1);
                const defaultEventId = events?.[0]?.id;

                if (!defaultEventId) {
                    toast.error('No se encontró un evento para asociar los asistentes');
                    setIsImporting(false);
                    return;
                }

                for (const row of rows) {
                    try {
                        const { error } = await supabase.from('attendees').insert({
                            event_id: defaultEventId,
                            name: row.name || row.Nombre,
                            email: row.email || row.Email,
                            company: row.company || row.Empresa || null,
                            job_title: row.job_title || row.Cargo || null,
                            is_vip: row.is_vip === 'true' || row.VIP === 'sí',
                        });

                        if (error) failCount++;
                        else successCount++;
                    } catch (e) {
                        failCount++;
                    }
                }

                setImportResults({ success: successCount, failed: failCount });
                setIsImporting(false);
                toast.success('Proceso de importación finalizado');
            },
            error: (error: Error) => {
                toast.error(`Error al leer el archivo: ${error.message}`);
                setIsImporting(false);
            }
        });
    };

    const downloadTemplate = () => {
        const csv = Papa.unparse([{
            name: 'Ejemplo Nombre',
            email: 'ejemplo@correo.com',
            company: 'Mi Empresa',
            job_title: 'Director',
            is_vip: 'false'
        }]);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'plantilla_asistentes.csv');
        link.click();
    };

    return (
        <div>
            <div className="admin-page-header">
                <div>
                    <h1 className="admin-page-title">{t('admin.nav.import_export', 'Import / Export')}</h1>
                    <p className="admin-page-subtitle">
                        {t('admin.import_export.subtitle', 'Manage your data via CSV files')}
                    </p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-8)' }}>
                {/* Export Card */}
                <div className="card" style={{ padding: 'var(--space-8)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
                        <div style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', background: 'rgba(var(--color-gold-rgb), 0.1)', color: 'var(--color-gold)' }}>
                            <Download size={24} />
                        </div>
                        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Exportar Datos</h2>
                    </div>

                    <p className="text-muted text-sm" style={{ marginBottom: 'var(--space-6)' }}>
                        Descarga toda la información de la base de datos en formato CSV compatible con Excel.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                        {[
                            { id: 'attendees', label: 'Asistentes' },
                            { id: 'sponsors', label: 'Patrocinadores' },
                            { id: 'speakers', label: 'Ponentes' },
                            { id: 'events', label: 'Eventos' },
                        ].map((table) => (
                            <button
                                key={table.id}
                                className="btn btn--outline"
                                style={{ justifyContent: 'space-between', padding: 'var(--space-4)' }}
                                onClick={() => handleExport(table.id)}
                                disabled={!!isExporting}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                    <FileText size={18} />
                                    <span>{table.label}</span>
                                </div>
                                {isExporting === table.id ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Import Card */}
                <div className="card" style={{ padding: 'var(--space-8)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
                        <div style={{ padding: 'var(--space-2)', borderRadius: 'var(--radius-md)', background: 'rgba(var(--color-blue-rgb), 0.1)', color: 'var(--color-blue)' }}>
                            <Upload size={24} />
                        </div>
                        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Importar Asistentes</h2>
                    </div>

                    <p className="text-muted text-sm" style={{ marginBottom: 'var(--space-4)' }}>
                        Sube una lista de asistentes desde un archivo CSV. Asegúrate de seguir el formato correcto.
                    </p>

                    <button
                        onClick={downloadTemplate}
                        className="btn btn--ghost btn--xs"
                        style={{ marginBottom: 'var(--space-6)', padding: 0, height: 'auto', textDecoration: 'underline' }}
                    >
                        Descargar plantilla CSV
                    </button>

                    <div
                        style={{
                            border: '2px dashed var(--color-border)',
                            borderRadius: 'var(--radius-lg)',
                            padding: 'var(--space-10)',
                            textAlign: 'center',
                            cursor: 'pointer',
                            position: 'relative'
                        }}
                    >
                        {isImporting ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)' }}>
                                <Loader2 className="animate-spin" size={32} style={{ color: 'var(--color-gold)' }} />
                                <span className="text-sm font-bold">Procesando archivo...</span>
                            </div>
                        ) : (
                            <>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleImportAttendees}
                                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                                />
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)' }}>
                                    <Upload size={32} style={{ color: 'var(--color-text-muted)' }} />
                                    <div className="text-sm">
                                        <span className="font-bold text-gold">Haz clic para subir</span> o arrastra un archivo
                                    </div>
                                    <span className="text-xs text-muted">Solo archivos CSV (Máx. 5MB)</span>
                                </div>
                            </>
                        )}
                    </div>

                    {importResults && (
                        <div
                            style={{
                                marginTop: 'var(--space-6)',
                                padding: 'var(--space-4)',
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--color-background-soft)',
                                border: '1px solid var(--color-border)'
                            }}
                        >
                            <h3 className="text-sm font-bold" style={{ marginBottom: 'var(--space-3)' }}>Resultado de la última importación:</h3>
                            <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-success)' }}>
                                    <CheckCircle2 size={16} />
                                    <span className="text-sm">{importResults.success} Éxitos</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-error)' }}>
                                    <AlertCircle size={16} />
                                    <span className="text-sm">{importResults.failed} Fallos</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
