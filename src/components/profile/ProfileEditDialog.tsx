import { useState, useRef } from "react";
import { Loader2, Upload } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type UserProfile } from "@/components/providers/AuthProvider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface ExtProfile extends UserProfile {
  bio?: string | null;
  dominant_hand?: "right" | "left" | "ambi" | null;
  backhand?: "one_handed" | "two_handed" | null;
  favorite_shot?: string | null;
  favorite_surface?: string | null;
  playing_style?: string | null;
  availability?: string | null;
  years_playing?: number | null;
  show_phone?: boolean | null;
  show_email?: boolean | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ExtProfile;
  onSaved: () => void;
}

const schema = z.object({
  first_name: z.string().trim().min(1, "Requerido").max(60),
  last_name: z.string().trim().min(1, "Requerido").max(60),
  bio: z.string().trim().max(280).optional().or(z.literal("")),
  favorite_shot: z.string().trim().max(60).optional().or(z.literal("")),
  playing_style: z.string().trim().max(60).optional().or(z.literal("")),
  availability: z.string().trim().max(120).optional().or(z.literal("")),
  years_playing: z.coerce.number().int().min(0).max(80).optional(),
});

export const ProfileEditDialog = ({ open, onOpenChange, profile, onSaved }: Props) => {
  const { user, refreshProfile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    first_name: profile.first_name ?? "",
    last_name: profile.last_name ?? "",
    bio: profile.bio ?? "",
    dominant_hand: profile.dominant_hand ?? "right",
    backhand: profile.backhand ?? "two_handed",
    favorite_shot: profile.favorite_shot ?? "",
    favorite_surface: profile.favorite_surface ?? "arcilla",
    playing_style: profile.playing_style ?? "",
    availability: profile.availability ?? "",
    years_playing: profile.years_playing?.toString() ?? "",
    show_phone: profile.show_phone ?? false,
    show_email: profile.show_email ?? false,
  });
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url);

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 3 * 1024 * 1024) {
      toast({ title: "Imagen muy grande", description: "Máx. 3MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) {
      setUploading(false);
      toast({ title: "Error subiendo foto", description: error.message, variant: "destructive" });
      return;
    }
    const { data: signed } = await supabase.storage
      .from("avatars")
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    setAvatarUrl(signed?.signedUrl ?? null);
    setUploading(false);
    toast({ title: "Foto cargada", description: "Recuerda guardar." });
  };

  const handleSave = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({
        title: "Datos inválidos",
        description: parsed.error.errors[0]?.message ?? "Revisa los campos",
        variant: "destructive",
      });
      return;
    }
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: parsed.data.first_name,
        last_name: parsed.data.last_name,
        bio: parsed.data.bio || null,
        dominant_hand: form.dominant_hand,
        backhand: form.backhand,
        favorite_shot: parsed.data.favorite_shot || null,
        favorite_surface: form.favorite_surface as "arcilla" | "cemento" | "pasto" | "sintetico",
        playing_style: parsed.data.playing_style || null,
        availability: parsed.data.availability || null,
        years_playing: parsed.data.years_playing ?? null,
        show_phone: form.show_phone,
        show_email: form.show_email,
        avatar_url: avatarUrl,
      })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" });
      return;
    }
    await refreshProfile();
    onSaved();
    onOpenChange(false);
    toast({ title: "Perfil actualizado" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar perfil</DialogTitle>
          <DialogDescription>
            Lo que marques como visible será mostrado al resto de socios del club.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-16 w-16">
              <AvatarImage src={avatarUrl ?? undefined} />
              <AvatarFallback>
                {form.first_name[0]}
                {form.last_name[0]}
              </AvatarFallback>
            </Avatar>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Upload className="mr-1 h-3 w-3" />
              )}
              Cambiar foto
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatar}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="first_name">Nombre</Label>
              <Input
                id="first_name"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                maxLength={60}
              />
            </div>
            <div>
              <Label htmlFor="last_name">Apellido</Label>
              <Input
                id="last_name"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                maxLength={60}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="bio">Bio (máx. 280)</Label>
            <Textarea
              id="bio"
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              maxLength={280}
              rows={3}
              placeholder="Cuéntanos algo de tu juego..."
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Mano dominante</Label>
              <Select
                value={form.dominant_hand}
                onValueChange={(v) => setForm({ ...form, dominant_hand: v as typeof form.dominant_hand })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="right">Diestro</SelectItem>
                  <SelectItem value="left">Zurdo</SelectItem>
                  <SelectItem value="ambi">Ambidiestro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Revés</Label>
              <Select
                value={form.backhand}
                onValueChange={(v) => setForm({ ...form, backhand: v as typeof form.backhand })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_handed">Una mano</SelectItem>
                  <SelectItem value="two_handed">Dos manos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="favorite_shot">Golpe favorito</Label>
              <Input
                id="favorite_shot"
                value={form.favorite_shot}
                onChange={(e) => setForm({ ...form, favorite_shot: e.target.value })}
                maxLength={60}
                placeholder="Drive, saque, volea..."
              />
            </div>
            <div>
              <Label>Superficie favorita</Label>
              <Select
                value={form.favorite_surface}
                onValueChange={(v) => setForm({ ...form, favorite_surface: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="arcilla">Arcilla</SelectItem>
                  <SelectItem value="cemento">Cemento</SelectItem>
                  <SelectItem value="pasto">Pasto</SelectItem>
                  <SelectItem value="sintetico">Sintético</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="playing_style">Estilo</Label>
              <Input
                id="playing_style"
                value={form.playing_style}
                onChange={(e) => setForm({ ...form, playing_style: e.target.value })}
                maxLength={60}
                placeholder="Defensivo, agresivo..."
              />
            </div>
            <div>
              <Label htmlFor="years_playing">Años jugando</Label>
              <Input
                id="years_playing"
                type="number"
                min={0}
                max={80}
                value={form.years_playing}
                onChange={(e) => setForm({ ...form, years_playing: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="availability">Disponibilidad</Label>
            <Input
              id="availability"
              value={form.availability}
              onChange={(e) => setForm({ ...form, availability: e.target.value })}
              maxLength={120}
              placeholder="Lun-Mié 19:00, sábados AM..."
            />
          </div>

          <div className="space-y-2 rounded-2xl border border-border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Visibilidad de contacto
            </p>
            <div className="flex items-center justify-between">
              <Label htmlFor="show_phone" className="text-sm font-normal">
                Mostrar mi teléfono al club
              </Label>
              <Switch
                id="show_phone"
                checked={form.show_phone}
                onCheckedChange={(c) => setForm({ ...form, show_phone: c })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="show_email" className="text-sm font-normal">
                Mostrar mi email al club
              </Label>
              <Switch
                id="show_email"
                checked={form.show_email}
                onCheckedChange={(c) => setForm({ ...form, show_email: c })}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
