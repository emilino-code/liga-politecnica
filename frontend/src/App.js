import { useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

import { AuthProvider, useAuth } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import CreateQuick from "./pages/CreateQuick";
import CreateLeague from "./pages/CreateLeague";
import TournamentDetail from "./pages/TournamentDetail";
import PublicView from "./pages/PublicView";
import RefereeLogin from "./pages/RefereeLogin";
import RefereeBoard from "./pages/RefereeBoard";

function HomeRouter() {
    const { user, checked } = useAuth();
    if (!checked)
        return (
            <div className="min-h-screen flex items-center justify-center text-slate-500">
                Cargando…
            </div>
        );
    if (user) return <Navigate to="/dashboard" replace />;
    return <Landing />;
}

function App() {
    useEffect(() => {
        document.title = "VolleyPro · Liga & Torneos";
    }, []);

    return (
        <div className="App min-h-screen bg-slate-50 text-slate-900">
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<HomeRouter />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route
                            path="/dashboard"
                            element={
                                <ProtectedRoute>
                                    <Dashboard />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/create/quick"
                            element={
                                <ProtectedRoute>
                                    <CreateQuick />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/create/league"
                            element={
                                <ProtectedRoute>
                                    <CreateLeague />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/t/:tid"
                            element={
                                <ProtectedRoute>
                                    <TournamentDetail />
                                </ProtectedRoute>
                            }
                        />
                        <Route path="/public/:slug" element={<PublicView />} />
                        <Route path="/arbitro" element={<RefereeLogin />} />
                        <Route path="/arbitro/:slug" element={<RefereeBoard />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </BrowserRouter>
                <Toaster position="top-right" richColors />
            </AuthProvider>
        </div>
    );
}

export default App;
