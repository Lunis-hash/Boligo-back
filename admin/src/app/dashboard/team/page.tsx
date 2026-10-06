"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getAdminUser, getToken } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, type StaffRole } from "@/lib/roles";

interface Member {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  lastLogin: string | null;
  accountStatus: string;
}

const STAFF: StaffRole[] = ["ADMIN", "MODERATOR", "MARKETING"];

export default function TeamPage() {
  const me = getAdminUser();
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("MODERATOR");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    apiFetch<Member[]>("/admin/team", { token: getToken() })
      .then(setMembers)
      .catch((e) => setMsg({ ok: false, text: e instanceof Error ? e.message : "Chargement impossible" }));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setAccess(targetEmail: string, newRole: string) {
    setBusy(true);
    setMsg(null);
    try {
      await apiFetch("/admin/team", {
        method: "PATCH",
        token: getToken(),
        body: JSON.stringify({ email: targetEmail, role: newRole }),
      });
      setMsg({
        ok: true,
        text:
          newRole === "USER"
            ? `Accès retiré à ${targetEmail}.`
            : `${targetEmail} : ${ROLE_LABELS[newRole]}. La personne se connecte avec son compte BOLIGO.`,
      });
      setEmail("");
      load();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Erreur" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Équipe"
        description="Qui peut ouvrir ce tableau de bord, et pour quoi faire. La personne crée d’abord un compte BOLIGO depuis l’application, avec son adresse e-mail ; vous lui donnez ensuite un rôle ici."
      />

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        {STAFF.map((r) => (
          <div key={r} className="rounded-2xl border border-neutral-200 bg-white p-5">
            <p className="font-title text-lg text-encre">{ROLE_LABELS[r]}</p>
            <p className="mt-1 text-sm text-neutral-600">{ROLE_DESCRIPTIONS[r]}</p>
          </div>
        ))}
      </div>

      <form
        className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-neutral-200 bg-white p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (email.trim()) setAccess(email.trim(), role);
        }}
      >
        <label className="text-sm">
          <span className="mb-1 block text-neutral-500">Adresse e-mail du compte BOLIGO</span>
          <Input
            className="h-10 w-72 rounded-xl"
            type="email"
            placeholder="prenom@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="team-email"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-neutral-500">Rôle</span>
          <select
            className="h-10 rounded-xl border border-input bg-white px-3 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value as StaffRole)}
            data-testid="team-role"
          >
            {STAFF.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="submit"
          disabled={busy || !email.trim()}
          className="rounded-xl bg-gradient-to-r from-framboise to-lavande hover:opacity-90"
          data-testid="team-submit"
        >
          Donner l’accès
        </Button>
        <p className="w-full text-xs text-neutral-500">
          Un compte d’équipe n’apparaît plus dans la Découverte des membres.
        </p>
      </form>

      {msg && (
        <p
          className={`mb-4 rounded-xl px-4 py-3 text-sm ${msg.ok ? "bg-lilas text-nuit" : "bg-rose text-framboise"}`}
          data-testid="team-msg"
        >
          {msg.text}
        </p>
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Personne</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Dernière connexion</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => {
              const self = m.id === me?.id;
              return (
                <TableRow key={m.id} data-testid={`team-row-${m.email}`}>
                  <TableCell>
                    <p className="font-medium text-encre">
                      {m.firstName} {m.lastName} {self && <span className="text-xs text-neutral-500">(vous)</span>}
                    </p>
                    <p className="text-xs text-neutral-500">{m.email}</p>
                  </TableCell>
                  <TableCell>
                    {self ? (
                      <span className="text-sm">{ROLE_LABELS[m.role] ?? m.role}</span>
                    ) : (
                      <select
                        className="h-9 rounded-xl border border-input bg-white px-2 text-sm"
                        value={m.role}
                        disabled={busy}
                        onChange={(e) => setAccess(m.email, e.target.value)}
                      >
                        {STAFF.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-neutral-500">{formatDate(m.lastLogin)}</TableCell>
                  <TableCell className="text-right">
                    {!self && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-framboise/30 text-framboise hover:bg-rose"
                        disabled={busy}
                        onClick={() => setAccess(m.email, "USER")}
                      >
                        Retirer l’accès
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
