import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children }) {
    const { user, checked } = useAuth();
    if (!checked) {
        return (
            <div className="min-h-screen flex items-center justify-center text-slate-500">
                Cargando…
            </div>
        );
    }
    if (!user) return <Navigate to="/login" replace />;
    return children;
}
