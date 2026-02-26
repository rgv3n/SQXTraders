import { Outlet } from 'react-router-dom';
import PublicNavbar from '@/components/public/PublicNavbar';
import PublicFooter from '@/components/public/PublicFooter';

export default function PublicLayout() {
    return (
        <div className="public-layout">
            <PublicNavbar />
            <main className="public-main">
                <Outlet />
            </main>
            <PublicFooter />
        </div>
    );
}
