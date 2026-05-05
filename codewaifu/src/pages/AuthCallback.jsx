import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NeonButton } from '../components/UI/NeonButton';
import { useStore } from '../store/useStore';
import { completeGitHubOAuth } from '../utils/githubAuth';

export function AuthCallback() {
    const navigate = useNavigate();
    const connectWithGitHub = useStore((s) => s.connectWithGitHub);
    const setCharacterName = useStore((s) => s.setCharacterName);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('Завершуємо GitHub авторизацію...');

    useEffect(() => {
        let active = true;
        const run = async () => {
            const params = new URLSearchParams(window.location.search);
            const oauthError = params.get('error_description') || params.get('error');
            const code = params.get('code');
            const state = params.get('state');

            if (oauthError) {
                throw new Error(oauthError);
            }
            if (!code || !state) {
                throw new Error('GitHub не повернув OAuth code/state.');
            }

            const { accessToken, characterName } = await completeGitHubOAuth({ code, state });
            if (characterName) setCharacterName(characterName);
            if (active) setStatus('Завантажуємо GitHub профіль...');
            await connectWithGitHub(accessToken);
            if (active) navigate('/dashboard', { replace: true });
        };

        run().catch((e) => {
            if (!active) return;
            setError(e instanceof Error ? e.message : 'GitHub OAuth помилка');
            setStatus('Авторизацію не завершено');
        });

        return () => {
            active = false;
        };
    }, [connectWithGitHub, navigate, setCharacterName]);

    return (
        <div className="min-h-screen grid place-items-center px-6">
            <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass max-w-md w-full p-6 text-center space-y-4"
            >
                <div className="font-display text-2xl font-black text-gradient">
                    GitHub OAuth
                </div>
                <p className="text-sm text-white/60">{status}</p>
                {!error && <div className="h-2 rounded-full bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink animate-pulse" />}
                {error && (
                    <div className="text-sm text-neon-pink bg-neon-pink/5 border border-neon-pink/30 px-3 py-2 rounded-lg">
                        {error}
                    </div>
                )}
                {error && (
                    <NeonButton type="button" variant="primary" onClick={() => navigate('/', { replace: true })}>
                        Спробувати ще раз
                    </NeonButton>
                )}
            </motion.div>
        </div>
    );
}
