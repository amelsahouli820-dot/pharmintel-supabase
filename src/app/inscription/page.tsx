"use client";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { UserPlus, Mail, User, ShieldCheck, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";

export default function RegistrationPage() {
  const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [done, setDone] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), email: form.get("email") }) });
    const data = await response.json(); setLoading(false);
    if (!response.ok) return setError(data.error || "Demande impossible.");
    setDone(true);
  }
  return <main className="password-page"><section className="password-card registration-card">
    <div className="login-icon">{done ? <CheckCircle2 size={24}/> : <UserPlus size={24}/>}</div>
    {done ? <><span className="eyebrow">DEMANDE TRANSMISE</span><h1>Votre demande est enregistrée</h1><p>L’administrateur doit maintenant autoriser votre compte. Il vous communiquera ensuite un mot de passe temporaire.</p><div className="access-note"><ShieldCheck size={16}/><p><strong>Validation obligatoire</strong><small>Aucune connexion n’est possible avant l’approbation de l’administrateur.</small></p></div><Link className="btn btn-primary" href="/connexion"><ArrowLeft size={15}/> Retour à la connexion</Link></> :
    <form onSubmit={submit}><span className="eyebrow">ACCÈS COLLABORATEUR</span><h1>Demander un accès</h1><p>Renseignez vos informations professionnelles. Votre demande sera soumise à l’administrateur.</p>{error&&<div className="form-alert"><AlertCircle size={16}/>{error}</div>}<div className="field"><label>Nom complet</label><div className="input-icon"><User size={17}/><input name="name" required minLength={2} maxLength={100} placeholder="Nom et prénom"/></div></div><div className="field"><label>Adresse e-mail</label><div className="input-icon"><Mail size={17}/><input name="email" required type="email" placeholder="nom@entreprise.dz"/></div></div><button className="btn btn-primary registration-submit" disabled={loading}>{loading?"Envoi…":"Envoyer ma demande"}</button><small className="safe-note"><ShieldCheck size={13}/> L’administrateur contrôle et autorise chaque inscription.</small><Link className="back-login" href="/connexion"><ArrowLeft size={13}/> J’ai déjà un compte</Link></form>}
  </section></main>;
}
