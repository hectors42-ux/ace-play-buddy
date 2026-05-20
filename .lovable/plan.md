## Plan: capturas QA responsive (interno + externo)

### Alcance
Capturar y revisar 3 vistas en 3 breakpoints (375 / 768 / 1280), cubriendo ambos modos donde aplica. Total ≈ 15 capturas.

### Matriz de capturas

| Vista | Interno | Externo |
|---|---|---|
| **ConfirmSlotDialog** (ladder, jugador confirma slot) | 375 / 768 / 1280 | 375 / 768 / 1280 (banner ámbar + CTA "Reservar en EasyCancha") |
| **ScheduleDialog** (admin torneo, agendar partido) | 375 / 768 / 1280 | 375 / 768 / 1280 (banner ámbar + recordatorio) |
| **MisReservas** | 375 / 768 / 1280 | N/A — la página redirige a `/` en modo externo (comportamiento esperado) |

### Pasos
1. **Modo externo (estado actual)** — capturar:
   - ConfirmSlotDialog: navegar a Ladder → tomar challenge entrante → abrir diálogo de confirmación de slot, screenshot en 375/768/1280.
   - ScheduleDialog: navegar a Admin · Torneos → AdminTorneoDetalle → abrir "Agendar" en un partido, screenshot en 375/768/1280.
2. **Cambiar a modo interno** — desde Admin · Canchas, desactivar `bookings_provider = external` (toggle en `BookingsProviderCard`).
3. **Modo interno** — capturar:
   - ConfirmSlotDialog (sin banner) × 3.
   - ScheduleDialog (sin banner) × 3.
   - MisReservas (ya accesible) × 3.
4. **Restaurar modo externo** dejando el toggle en el estado original.
5. **Inspección** — revisar cada captura por: overflow, texto cortado, botones tapados por BottomNav, banner ámbar legible, layout sidebar+contenido en desktop, max-w-md ensanchado a 56rem en lg+.
6. **Entrega** — adjuntar capturas en el chat agrupadas por vista y modo, con una nota corta por cada hallazgo (✅ o ❌ + descripción).

### Notas
- Sin cambios de código planeados; solo toggle temporal del proveedor de reservas vía la UI de Admin (revertido al final).
- Si encuentro un bug visual, lo reporto antes de proponer fix.
- Si algún diálogo requiere data que la cuenta `demouser@aceplay.cl` no tiene (challenge entrante / partido agendable), uso `hectors42@gmail.com` o creo el estado mínimo desde el otro usuario.
