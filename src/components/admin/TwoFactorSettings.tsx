"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TwoFactorSettingsProps = {
  initialEnabled: boolean;
};

type SetupStep = "closed" | "loading" | "scan" | "codes";

function BackupCodeList({ codes }: { codes: string[] }) {
  return (
    <ul className="grid grid-cols-2 gap-2 font-mono text-sm">
      {codes.map((code) => (
        <li key={code} className="rounded-md border px-2 py-1 text-center">
          {code}
        </li>
      ))}
    </ul>
  );
}

export function TwoFactorSettings({ initialEnabled }: TwoFactorSettingsProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);

  const [setupStep, setSetupStep] = useState<SetupStep>("closed");
  const [qrDataUri, setQrDataUri] = useState("");
  const [secret, setSecret] = useState("");
  const [setupCode, setSetupCode] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [newBackupCodes, setNewBackupCodes] = useState<string[]>([]);

  const [disableOpen, setDisableOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disabling, setDisabling] = useState(false);

  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [regeneratePassword, setRegeneratePassword] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [regeneratedCodes, setRegeneratedCodes] = useState<string[]>([]);

  async function startSetup() {
    setSetupStep("loading");
    const res = await fetch("/api/admin/2fa/setup", { method: "POST" });
    if (!res.ok) {
      toast.error("Could not start 2FA setup");
      setSetupStep("closed");
      return;
    }
    const data = await res.json();
    setSecret(data.secret);
    setQrDataUri(data.qrDataUri);
    setSetupCode("");
    setSetupStep("scan");
  }

  async function confirmSetup() {
    setConfirming(true);
    const res = await fetch("/api/admin/2fa/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, code: setupCode }),
    });
    setConfirming(false);
    if (!res.ok) {
      toast.error("Invalid code — try again");
      return;
    }
    const data = await res.json();
    setNewBackupCodes(data.backupCodes);
    setSetupStep("codes");
  }

  function finishSetup() {
    setSetupStep("closed");
    setSecret("");
    setQrDataUri("");
    setNewBackupCodes([]);
    setEnabled(true);
    toast.success("Two-factor authentication enabled");
    router.refresh();
  }

  async function disable() {
    setDisabling(true);
    const res = await fetch("/api/admin/2fa/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: disablePassword }),
    });
    setDisabling(false);
    if (!res.ok) {
      toast.error("Invalid password");
      return;
    }
    setDisableOpen(false);
    setDisablePassword("");
    setEnabled(false);
    toast.success("Two-factor authentication disabled");
    router.refresh();
  }

  async function regenerate() {
    setRegenerating(true);
    const res = await fetch("/api/admin/2fa/backup-codes/regenerate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: regeneratePassword }),
    });
    setRegenerating(false);
    if (!res.ok) {
      toast.error("Invalid password");
      return;
    }
    const data = await res.json();
    setRegeneratePassword("");
    setRegeneratedCodes(data.backupCodes);
  }

  function closeRegenerate() {
    setRegenerateOpen(false);
    setRegeneratedCodes([]);
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <h2 className="text-sm font-semibold">Two-factor authentication</h2>

      {enabled ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground text-sm">
            Enabled — an authenticator app code is required at sign-in.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setRegenerateOpen(true)}>
              Regenerate backup codes
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDisableOpen(true)}>
              Disable
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground text-sm">
            Not enabled — sign-in only requires a password.
          </p>
          <Button size="sm" onClick={startSetup}>
            Enable
          </Button>
        </div>
      )}

      <Dialog
        open={setupStep !== "closed"}
        onOpenChange={(open) => !open && setSetupStep("closed")}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {setupStep === "codes"
                ? "Save your backup codes"
                : "Set up two-factor authentication"}
            </DialogTitle>
            {setupStep === "scan" && (
              <DialogDescription>
                Scan this QR code with your authenticator app, then enter the 6-digit code
                it shows.
              </DialogDescription>
            )}
            {setupStep === "codes" && (
              <DialogDescription>
                Store these somewhere safe — each works once if you lose access to your
                authenticator app. They won&apos;t be shown again.
              </DialogDescription>
            )}
          </DialogHeader>

          {setupStep === "loading" && (
            <p className="text-muted-foreground text-sm">Generating…</p>
          )}

          {setupStep === "scan" && (
            <div className="flex flex-col items-center gap-4">
              {qrDataUri && (
                // A locally-generated data: URI — next/image's optimization
                // pipeline doesn't apply to it.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUri}
                  alt="Scan this QR code with your authenticator app"
                  className="size-48 rounded-md border"
                />
              )}
              <p className="text-muted-foreground font-mono text-xs break-all">
                {secret}
              </p>
              <div className="flex w-full flex-col gap-1.5">
                <Label htmlFor="setup-code">6-digit code</Label>
                <Input
                  id="setup-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={setupCode}
                  onChange={(e) => setSetupCode(e.target.value)}
                />
              </div>
            </div>
          )}

          {setupStep === "codes" && <BackupCodeList codes={newBackupCodes} />}

          <DialogFooter>
            {setupStep === "scan" && (
              <Button
                onClick={confirmSetup}
                disabled={confirming || setupCode.length < 6}
              >
                {confirming ? "Verifying…" : "Confirm"}
              </Button>
            )}
            {setupStep === "codes" && (
              <Button onClick={finishSetup}>I&apos;ve saved these</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Disable two-factor authentication</DialogTitle>
            <DialogDescription>Confirm your password to disable 2FA.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="disable-password">Password</Label>
            <Input
              id="disable-password"
              type="password"
              autoComplete="current-password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={disable}
              disabled={disabling || !disablePassword}
            >
              {disabling ? "Disabling…" : "Disable"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={regenerateOpen} onOpenChange={(open) => !open && closeRegenerate()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {regeneratedCodes.length ? "New backup codes" : "Regenerate backup codes"}
            </DialogTitle>
            <DialogDescription>
              {regeneratedCodes.length
                ? "Your old backup codes no longer work. Store these somewhere safe."
                : "Confirm your password. This invalidates all existing backup codes."}
            </DialogDescription>
          </DialogHeader>

          {regeneratedCodes.length ? (
            <BackupCodeList codes={regeneratedCodes} />
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="regenerate-password">Password</Label>
              <Input
                id="regenerate-password"
                type="password"
                autoComplete="current-password"
                value={regeneratePassword}
                onChange={(e) => setRegeneratePassword(e.target.value)}
              />
            </div>
          )}

          <DialogFooter>
            {regeneratedCodes.length ? (
              <Button onClick={closeRegenerate}>Done</Button>
            ) : (
              <Button onClick={regenerate} disabled={regenerating || !regeneratePassword}>
                {regenerating ? "Regenerating…" : "Regenerate"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
