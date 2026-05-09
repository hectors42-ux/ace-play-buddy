import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/components/providers/AuthProvider";
import { useClubBrand } from "@/components/providers/ClubBrandProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import clubLogo from "@/assets/club-logo.png";

const emailSchema = z.string().trim().email("Email inválido").max(255);
const passwordSchema = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .max(72, "Máximo 72 caracteres");
const nameSchema = z.string().trim().min(1, "Requerido").max(80);

const Auth = () => {
  const { user, loading } = useAuth();
  const { brand } = useClubBrand();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirectTo = params.get("redirect") || "/";
  const [submitting, setSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotPassword, setForgotPassword] = useState("");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate(redirectTo, { replace: true });
  }, [user, loading, navigate, redirectTo]);

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = emailSchema.safeParse(forgotEmail);
    if (!email.success) {
      toast.error(email.error.errors[0].message);
      return;
    }
    const password = passwordSchema.safeParse(forgotPassword);
    if (!password.success) {
      toast.error(password.error.errors[0].message);
      return;
    }
    setForgotSubmitting(true);
    const { data, error } = await supabase.functions.invoke("dev-reset-password", {
      body: { email: email.data, password: password.data },
    });
    setForgotSubmitting(false);
    if (error || (data && (data as { error?: string }).error)) {
      const msg =
        (data as { error?: string } | null)?.error ||
        error?.message ||
        "No se pudo restablecer la contraseña";
      toast.error(msg);
      return;
    }
    toast.success("Contraseña actualizada. Ya puedes entrar.");
    setForgotOpen(false);
    setForgotEmail("");
    setForgotPassword("");
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const email = emailSchema.safeParse(fd.get("email"));
    const password = z.string().min(1, "Requerido").safeParse(fd.get("password"));
    if (!email.success || !password.success) {
      toast.error(email.error?.errors[0]?.message || password.error?.errors[0]?.message || "Datos inválidos");
      setSubmitting(false);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: email.data,
      password: password.data,
    });
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "Credenciales incorrectas" : error.message);
    } else {
      toast.success("¡Bienvenido!");
    }
    setSubmitting(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const email = emailSchema.safeParse(fd.get("email"));
    const password = passwordSchema.safeParse(fd.get("password"));
    const firstName = nameSchema.safeParse(fd.get("first_name"));
    const lastName = nameSchema.safeParse(fd.get("last_name"));
    const firstError = [email, password, firstName, lastName].find((r) => !r.success);
    if (firstError && !firstError.success) {
      toast.error(firstError.error.errors[0].message);
      setSubmitting(false);
      return;
    }
    const { error } = await supabase.auth.signUp({
      email: email.data!,
      password: password.data!,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          first_name: firstName.data!,
          last_name: lastName.data!,
        },
      },
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Cuenta creada. ¡Bienvenido al club!");
    }
    setSubmitting(false);
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/`,
    });
    if (result.error) {
      toast.error("No se pudo iniciar sesión con Google");
      setSubmitting(false);
    }
  };

  const handleApple = async () => {
    setSubmitting(true);
    const result = await lovable.auth.signInWithOAuth("apple", {
      redirect_uri: `${window.location.origin}/`,
    });
    if (result.error) {
      toast.error("No se pudo iniciar sesión con Apple");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-warm px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-3xl bg-gradient-clay shadow-clay">
            <img src={clubLogo} alt={brand.name} className="h-12 w-12 object-contain" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground">{brand.name}</h1>
            <p className="text-sm text-muted-foreground">Tu cuenta de socio</p>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Registrarse</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input id="signin-email" name="email" type="email" autoComplete="email" required />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signin-password">Contraseña</Label>
                    <button
                      type="button"
                      onClick={() => setForgotOpen(true)}
                      className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <PasswordInput id="signin-password" name="password" autoComplete="current-password" required />
                </div>
                <Button type="submit" variant="clay" size="lg" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="signup-first">Nombre</Label>
                    <Input id="signup-first" name="first_name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-last">Apellido</Label>
                    <Input id="signup-last" name="last_name" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" name="email" type="email" autoComplete="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Contraseña</Label>
                  <PasswordInput
                    id="signup-password"
                    name="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
                </div>
                <Button type="submit" variant="clay" size="lg" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear cuenta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>o</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={handleGoogle}
            disabled={submitting}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continuar con Google
          </Button>
        </div>

      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restablecer contraseña</DialogTitle>
            <DialogDescription>
              Ingresa tu email y la nueva contraseña que quieres usar.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-foreground">
            <strong>Modo dev:</strong> el cambio de contraseña aplica al instante sin verificar email. Desactivar antes de invitar socios reales.
          </div>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="forgot-password">Nueva contraseña</Label>
              <PasswordInput
                id="forgot-password"
                autoComplete="new-password"
                minLength={8}
                value={forgotPassword}
                onChange={(e) => setForgotPassword(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setForgotOpen(false)}
                disabled={forgotSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="clay" disabled={forgotSubmitting}>
                {forgotSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cambiar contraseña"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
