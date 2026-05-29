# Fase C — Open Match dobles + pádel + pareja vs pareja ✅

Schema:
- `match_open_posts.partner_user_id uuid` (autor's pareja en `pair_vs_pair`).
- Trigger `tg_match_open_post_seed_slots` actualizado: si `mode='pair_vs_pair'` y `match_type='doubles'`, llena team1 slot 1 con `partner_user_id`.

RPC `join_open_match(_post_id, _slot_index?, _partner_user_id?)`:
- `pair_vs_pair`: requiere `_partner_user_id`, valida nivel/club de la pareja, ocupa ambos cupos team2 atómicamente.
- `open_slots`: comportamiento previo (toma primer cupo libre).

Frontend:
- `OpenMatchWizard` paso 2 ampliado: chips singles/dobles (en pádel forzado a dobles), chips de modo (cupos abiertos / pareja vs pareja), `PartnerPicker` cuando aplica, formato (pádel sin best_of_5).
- `OpenMatchJoinDialog` nuevo: popup con `PartnerPicker` cuando alguien se une a un `pair_vs_pair`.
- `OpenMatchCard`: botón "Unirme con mi pareja" para `pair_vs_pair`; resto sin cambios (ya soportaba 4 slots).
- `PartnerSearchView`: intercepta el join para abrir el diálogo si el post es `pair_vs_pair`.

Pendiente futuro:
- Fase D — ResultWizard 3 pasos para cargar resultado al confirmarse el partido.
- Fase E — escenarios `OS-01..OS-04` en runner E2E.
