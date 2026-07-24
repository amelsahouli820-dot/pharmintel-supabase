"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, BrainCircuit, LineChart, CheckCircle2, AlertCircle, UserPlus, KeyRound, HelpCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter(); const [show, setShow] = useState(false); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError("");
    const form = new FormData(e.currentTarget);
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
    const data = await response.json(); setLoading(false);
    if (!response.ok) return setError(data.error || "Connexion impossible.");
    router.replace(data.mustChangePassword ? "/mot-de-passe" : "/accueil"); router.refresh();
  }
  return <main className="login-page">
    <section className="login-visual">
      <div className="login-glow one"/><div className="login-glow two"/>
      <div className="login-visual-inner">
        <div className="login-brand"><span className="brand-mark"><span>+</span></span><span><strong>Pharm</strong>Intel<small>VEILLE PHARMACEUTIQUE</small></span></div>
        <div className="login-message"><span className="login-kicker"><span/> INTELLIGENCE CONCURRENTIELLE</span><h1>Transformez chaque information en <em>décision stratégique.</em></h1><p>Centralisez, analysez et comparez les offres du marché pharmaceutique grâce à une plateforme sécurisée propulsée par l’intelligence artificielle.</p>
          <div className="login-features"><div><span><BrainCircuit size={19}/></span><p><strong>Analyse IA instantanée</strong><small>Extraction automatique de toutes vos données</small></p></div><div><span><LineChart size={19}/></span><p><strong>Vision complète du marché</strong><small>Indicateurs et comparaisons en temps réel</small></p></div><div><span><ShieldCheck size={19}/></span><p><strong>Données protégées</strong><small>Accès strict par rôle et espace individuel</small></p></div></div>
        </div>
        <div className="login-proof"><div className="proof-avatars"><i>AM</i><i>KB</i><i>SL</i><i>+8</i></div><p><span>●●●●●</span><small>Une information fiable, au bon moment.</small></p></div>
      </div>
    </section>
    <section className="login-form-side"><div className="login-mobile-brand"><span className="brand-mark"><span>+</span></span><b>PharmIntel</b></div><form className="login-card" onSubmit={submit}>
      <div className="login-icon"><LockKeyhole size={23}/></div><h2>Bienvenue</h2><p className="login-subtitle">Connectez-vous à votre espace de veille sécurisé</p>
      {error && <div className="form-alert"><AlertCircle size={16}/><span>{error}</span></div>}
      <div className="field login-field"><label htmlFor="email">Adresse e-mail professionnelle</label><div className="input-icon"><Mail size={17}/><input id="email" name="email" type="email" placeholder="nom@entreprise.dz" autoComplete="email" required autoFocus/></div></div>
      <div className="field login-field"><div className="label-row"><label htmlFor="password">Mot de passe / code d’activation</label></div><div className="input-icon"><LockKeyhole size={17}/><input id="password" name="password" type={show ? "text" : "password"} placeholder="••••••••••••" autoComplete="current-password" required minLength={8}/><button type="button" onClick={() => setShow(!show)} aria-label="Afficher le mot de passe">{show ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></div>
      <button className="login-submit" disabled={loading}>{loading ? <span className="spinner"/> : <>Se connecter <span>→</span></>}</button>
      <div className="access-note"><ShieldCheck size={16}/><p><strong>Accès sur autorisation uniquement</strong><small>Votre compte doit être créé et validé par l’administrateur.</small></p></div>
      <a className="registration-link" href="/inscription"><UserPlus size={15}/> Créer un compte / demander un accès</a>
      <div className="recovery-links"><a href="/mot-de-passe-oublie"><KeyRound size={13}/> Mot de passe oublié ?</a><a href="/identifiant-oublie"><Mail size={13}/> Adresse e-mail oubliée ?</a><a href="/aide"><HelpCircle size={13}/> Contacter l’administrateur</a></div>
      <div className="security-line"><CheckCircle2 size={13}/> Connexion chiffrée et sécurisée</div>
    </form><footer>© {new Date().getFullYear()} PharmIntel <span>•</span> Plateforme de veille concurrentielle</footer></section>
  </main>;
}
