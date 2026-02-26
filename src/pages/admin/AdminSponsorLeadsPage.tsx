import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, Search, ExternalLink, Filter } from 'lucide-react';
import { useTranslation } from '@/i18n/TranslationProvider';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

interface SponsorLead {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    company: string | null;
    message: string | null;
    created_at: string;
    sponsor: {
        name: string;
    };
    event: {
        title: string;
    };
}

export default function AdminSponsorLeadsPage() {
    const { t } = useTranslation();
    const qc = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');

    const { data: leads = [], isLoading } = useQuery({
        queryKey: ['admin-sponsor-leads'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('sponsor_leads')
                .select(`
                    *,
                    sponsor:sponsors(name),
                    event:events(title)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as unknown as SponsorLead[];
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('sponsor_leads').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin-sponsor-leads'] });
            toast.success('Lead eliminado correctamente');
        },
        onError: (error: any) => {
            toast.error(`Error al eliminar: ${error.message}`);
        }
    });

    const filteredLeads = leads.filter(l =>
        l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.sponsor.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <div className="admin-page-header">
                <div>
                    <h1 className="admin-page-title">{t('admin.nav.sponsor_leads', 'Sponsor Leads')}</h1>
                    <p className="admin-page-subtitle">
                        {t('admin.sponsors.leads_subtitle', 'View and manage potential clients captured by sponsors')}
                    </p>
                </div>
            </div>

            <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, email, empresa o patrocinador..."
                            className="form-input"
                            style={{ width: '100%', paddingLeft: 40 }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="card" style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
                    <p className="text-muted">{t('common.loading', 'Loading...')}</p>
                </div>
            ) : (
                <div className="admin-table-wrapper">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Nombre</th>
                                <th>Contacto</th>
                                <th>Empresa</th>
                                <th>Patrocinador</th>
                                <th>Evento</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLeads.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-text-muted)' }}>
                                        {searchTerm ? 'No se encontraron leads que coincidan con la búsqueda.' : 'No hay leads registrados todavía.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredLeads.map((lead) => (
                                    <tr key={lead.id}>
                                        <td style={{ fontSize: 'var(--text-xs)', whiteSpace: 'nowrap' }}>
                                            {new Date(lead.created_at).toLocaleDateString()}
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{lead.name}</div>
                                            {lead.message && (
                                                <div style={{ fontSize: '10px', color: 'var(--color-gold)', marginTop: 2, fontStyle: 'italic' }}>
                                                    "{(lead.message.length > 50 ? lead.message.substring(0, 50) + '...' : lead.message)}"
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <div style={{ fontSize: 'var(--text-sm)' }}>{lead.email}</div>
                                            {lead.phone && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{lead.phone}</div>}
                                        </td>
                                        <td>{lead.company ?? '—'}</td>
                                        <td>
                                            <span className="badge badge--gold" style={{ fontSize: 'var(--text-xs)' }}>
                                                {lead.sponsor.name}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: 'var(--text-sm)' }}>{lead.event.title}</td>
                                        <td>
                                            <button
                                                className="btn btn--ghost btn--xs"
                                                style={{ color: 'var(--color-error)' }}
                                                onClick={() => {
                                                    if (confirm('¿Estás seguro de que quieres eliminar este lead?')) {
                                                        deleteMutation.mutate(lead.id);
                                                    }
                                                }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
