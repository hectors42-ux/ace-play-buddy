

## Roadmap consolidado AcePlay v2 — fuente de verdad

A partir de ahora cada "¿cómo vamos?" se responde contra esta tabla. Cualquier feature nueva se agrega como fila y se sigue hasta ✅.

### Estado por épica

```text
Épica                                          Estado        Prioridad
─────────────────────────────────────────────────────────────────────
S1  Foundation (multi-tenant, auth, RBAC)      ✅ Hecho       —
S2  Reservations (motor, calendario, waitlist) ✅ Hecho*      —
S3  Payments & Ledger (Webpay real)            🟡 Stub demo   ALTA
S4  Coaches (perfil, clases, paquetes)         ✅ Hecho       —
S5  Iluminación (recargo por horario)          ❌ Pendiente   ALTA
S6  Tournaments + Ladder                       ✅ Hecho       —
S7  Analytics & Notifications (push/mail/WA)   ❌ Pendiente   MEDIA

NUEVAS
N1  Profile & Community card (Playtomic-like)  ✅ Hecho       —
N2  Demo user + avatares                       ✅ Hecho       —
N3  Landing pública                            ❌ Pendiente   ALTA
N4  Comunidad / Feed social                    ❌ Pendiente   ALTA  ← NUEVO
N5  Testing & Optimización E2E                 ❌ Pendiente   ALTA
```

(*) S2 funciona pero falta el sub-módulo S5 de iluminación.

### N4 — Comunidad / Feed social (detalle a definir)

Idea base: un timeline tipo Strava/Playtomic dentro del club donde los socios:
- Vean automáticamente actividad relevante (resultados de partidos, ascensos en pirámide, victorias en torneos, logros desbloqueados, anuncios del club).
- Puedan publicar posts manuales (texto + imagen opcional): "busco partido sábado AM", "vendo paleta", "felicitaciones al campeón".
- Reaccionen (👏 / 🔥 / 🎾) y comenten.
- Filtren por: Todo · Mis amigos · Solo club · Solo mi categoría.

### Preguntas para cerrar el alcance de N4 y N3

Antes de arrancar necesito alinear 4 cosas. Las dejo abajo en formato pregunta, te las haré una por una con `ask_questions` cuando aprobemos este roadmap.

1. **N4 — Tipo de feed**: ¿100% automático (solo eventos del sistema), 100% manual (solo posts de socios), o mixto?
2. **N4 — Interacciones**: ¿solo reacciones, reacciones + comentarios, o además mensajería 1-a-1?
3. **N3 — Audiencia de la landing**: ¿landing del Club Providencia (atraer socios) o landing de AcePlay como producto (vender a otros clubs)?
4. **Orden de ejecución**: dado que ahora son 5 pendientes (S3, S5, S7, N3, N4, N5), ¿confirmas este orden? → **N3 Landing → N4 Comunidad → S5 Iluminación → S3 Webpay real → S7 Notifications → N5 Testing E2E**. O prefieres otro.

### Detalle técnico de las épicas pendientes

**S3 — Webpay real**
- Edge functions `transbank-create` / `transbank-confirm` con SDK oficial.
- Tabla `payment_transactions` + asientos en `ledger`.
- Flujo de reembolsos según `cancel_window_hours`.
- Bloqueo automático por morosidad (`dues_status = moroso`).

**S5 — Iluminación**
- Campos `lighting_enabled`, `lighting_start_at`, `lighting_surcharge_clp` en `courts` o `booking_rules`.
- Cálculo en motor de reservas (`createBooking`).
- UI: "+$X por iluminación" visible en el slot picker.

**S7 — Analytics & Notifications**
- Dashboard gerencia: ocupación, ingresos, no-show, top socios.
- PWA push (`web-push` + service worker + tabla `push_subscriptions`).
- Email transaccional (Resend) para confirmaciones/recordatorios.
- WhatsApp Business API: recordatorios y desafíos pirámide.

**N3 — Landing pública**
- Ruta `/` pública (logueados → redirigir a `/inicio`).
- Hero, features, screenshots, planes/contacto, FAQ.
- CTA "Soy socio → Ingresar" + secundario según audiencia (pregunta 3).
- SEO: meta tags, OG, sitemap, robots.

**N4 — Comunidad / Feed social**
- Tablas: `community_posts`, `community_reactions`, `community_comments`, `community_events` (auto-generados).
- Trigger en `tournament_match_results`, `ladder_challenges`, `user_badges` → inserta `community_events`.
- RLS por `tenant_id`.
- UI: nueva ruta `/comunidad` + tab en BottomNav, card de feed (texto/imagen/evento), composer con upload a Storage, feed con scroll infinito.
- Realtime via Supabase channels para reacciones/comentarios en vivo.
- Moderación: `is_club_admin` puede ocultar posts.

**N5 — Testing & Optimización E2E**
- Playwright: login, reserva, desafío pirámide, inscripción torneo, post en comunidad.
- Unit tests hooks críticos (`useUserProfileSummary`, motor reservas, `useLadderData`).
- Lighthouse + bundle analysis + lazy routes.
- Auditoría WCAG AA.
- Hardening RLS con `supabase--linter`.

### Persistencia del roadmap

Una vez aprobado, lo guardo en `mem://features/roadmap.md` para que persista entre sesiones y sea la referencia automática de futuros "¿cómo vamos?".

### Confirmación necesaria

Responde a las 4 preguntas (o dime "default" y asumo: feed mixto, reacciones + comentarios, landing del club, orden propuesto) y arranco con N3.

