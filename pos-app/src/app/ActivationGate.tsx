import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";

const LICENSE_ACTIVATION_KEY = "dcpos-license-activation-v1";
const LICENSE_DEVICE_ID_KEY = "dcpos-license-device-id-v1";

type ActivationPayload = {
  ok: boolean;
  valid: boolean;
  error?: string;
  supportEmail?: string;
  license?: {
    key?: string;
    activatedAt?: string;
    status?: string;
  };
};

type ActivationState = {
  licenseKey: string;
  activatedAt: string;
  supportEmail: string;
  deviceId: string;
  verifiedAt: string;
  apiBaseUrl: string;
};

function getApiBaseUrl() {
  const value = import.meta.env.VITE_LICENSE_API_BASE_URL || "https://abiad.systems/api";
  return String(value).replace(/\/+$/, "");
}

function normalizeLicenseKey(value: string) {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^POS/, "");
  if (!compact) return "";
  const chunks = compact.match(/.{1,4}/g) || [];
  return `POS-${chunks.join("-")}`;
}

function getOrCreateDeviceId() {
  const existing = localStorage.getItem(LICENSE_DEVICE_ID_KEY);
  if (existing) return existing;

  const next =
    globalThis.crypto?.randomUUID?.() ||
    `device-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
  localStorage.setItem(LICENSE_DEVICE_ID_KEY, next);
  return next;
}

function loadActivationState(): ActivationState | null {
  try {
    const raw = localStorage.getItem(LICENSE_ACTIVATION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ActivationState>;
    if (!parsed.licenseKey || !parsed.activatedAt) return null;

    return {
      licenseKey: parsed.licenseKey,
      activatedAt: parsed.activatedAt,
      supportEmail: parsed.supportEmail || "support@abiad.systems",
      deviceId: parsed.deviceId || getOrCreateDeviceId(),
      verifiedAt: parsed.verifiedAt || parsed.activatedAt,
      apiBaseUrl: parsed.apiBaseUrl || getApiBaseUrl(),
    };
  } catch {
    return null;
  }
}

async function activateLicenseRequest(params: {
  licenseKey: string;
  deviceId: string;
  apiBaseUrl: string;
}): Promise<ActivationPayload> {
  const response = await fetch(`${params.apiBaseUrl}/licenses/activate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      licenseKey: params.licenseKey,
      deviceId: params.deviceId,
      app: "dualpos",
      appVersion: "1.0.0",
    }),
  });

  const body = (await response.json().catch(() => ({}))) as ActivationPayload;
  if (!response.ok) return body;
  return body;
}

function toReadableError(errorCode: string | undefined) {
  switch (errorCode) {
    case "license_not_found":
      return "License key not found. Please check the key and try again.";
    case "license_inactive":
      return "This license is not active. Contact support.";
    case "license_already_activated_on_another_device":
      return "This license is already activated on another device.";
    case "license_key_required":
      return "Please enter a valid license key.";
    default:
      return "Activation failed. Please try again or contact support.";
  }
}

type ActivationGateProps = {
  children: ReactNode;
};

export function ActivationGate({ children }: ActivationGateProps) {
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const [licenseInput, setLicenseInput] = useState("");
  const [errorText, setErrorText] = useState("");
  const [statusText, setStatusText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(
    globalThis.navigator === undefined ? true : globalThis.navigator.onLine,
  );

  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const deviceId = useMemo(() => getOrCreateDeviceId(), []);

  useEffect(() => {
    const existing = loadActivationState();
    if (existing) {
      setIsActivated(true);
      setStatusText(`Activated on this device (${existing.licenseKey}).`);
    }
    setIsBootstrapped(true);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const licenseKey = normalizeLicenseKey(licenseInput);

    if (!licenseKey) {
      setErrorText("Please enter a valid license key.");
      return;
    }

    if (!isOnline) {
      setErrorText("Internet is required for first-time activation.");
      return;
    }

    setIsSubmitting(true);
    setErrorText("");
    setStatusText("");

    try {
      const result = await activateLicenseRequest({
        apiBaseUrl,
        deviceId,
        licenseKey,
      });

      if (!result.ok || !result.valid || !result.license?.key) {
        setErrorText(toReadableError(result.error));
        return;
      }

      const nextState: ActivationState = {
        licenseKey: result.license.key,
        activatedAt: result.license.activatedAt || new Date().toISOString(),
        supportEmail: result.supportEmail || "support@abiad.systems",
        deviceId,
        verifiedAt: new Date().toISOString(),
        apiBaseUrl,
      };

      localStorage.setItem(LICENSE_ACTIVATION_KEY, JSON.stringify(nextState));
      setIsActivated(true);
      setStatusText("Activation successful. Offline mode is now unlocked.");
    } catch {
      setErrorText("Could not reach the activation server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isBootstrapped) {
    return null;
  }

  if (isActivated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl space-y-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg border border-border bg-muted p-2">
            <LockKeyhole className="size-5" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">Activate DualPOS</h1>
            <p className="text-sm text-muted-foreground">
              Enter your lifetime license key once. After activation, the POS works fully offline.
            </p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground" htmlFor="license-key-input">
              License Key
            </label>
            <Input
              id="license-key-input"
              value={licenseInput}
              onChange={(event) => {
                setLicenseInput(event.target.value);
                setErrorText("");
              }}
              placeholder="POS-ABCD-1234-WXYZ"
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              Device ID: <span className="font-mono">{deviceId}</span>
            </p>
          </div>

          {!isOnline && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              Offline الآن. يلزم اتصال إنترنت للتفعيل أول مرة.
            </div>
          )}

          {errorText && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {errorText}
            </div>
          )}

          {statusText && (
            <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 flex items-center gap-2">
              <ShieldCheck className="size-4" />
              <span>{statusText}</span>
            </div>
          )}

          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Activating..." : "Activate License"}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground">
          Need help? Contact{" "}
          <a className="underline" href="mailto:support@abiad.systems">
            support@abiad.systems
          </a>
        </p>
      </div>
    </div>
  );
}

