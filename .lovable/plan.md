
# Suite E2E Playwright — Tenant `qa-sandbox`

8 flujos críticos sobre el mundo sembrado por `qa_seed_all()`, ejecutados contra el preview de Lovable con los 5 usuarios QA pre-existentes.

## Configuración base

**Dependencias (devDependencies):**
- `@playwright/test`
- `dotenv` (ya disponible vía vite, lo usamos explícito en config)

**Archivos nuevos:**
```text
playwright.config.ts
e2e/
  global-setup.ts            # qa_reset + qa_seed_all vía service_role
  fixtures/
    users.ts                 # mapa rol → {email, password} desde env
    auth.ts                  # fixtures `as(role)` que devuelven page logueada
    seed.ts                  # helpers para leer datos sembrados vía supabase anon
  helpers/
    login.ts                 # signInWithPassword + espera de redirect a /
    nav.ts                   # navegaciones comunes (a /torneos, /mis-torneos, etc.)
    scoring.ts               # helpers para llenar marcadores
  specs/
    e2e-01-crear-evento-herencia.spec.ts
    e2e-02-permiso-organizador.spec.ts
    e2e-03-ciclo-escalerilla.spec.ts
    e2e-04-correccion-resultado.spec.ts
    e2e-05-grupos-playoff.spec.ts
    e2e-06-scoring-invalido.spec.ts
    e2e-07-cierre-deadline.spec.ts
    e2e-08-historial-reputacion.spec.ts
  README.md                  # cómo correr local / CI, vars requeridas
.env.e2e.example             # template con todas las QA_*_EMAIL/PASSWORD
```

**Scripts en `package.json`:**
- `"e2e": "playwright test"`
- `"e2e:ui": "playwright test --ui"`
- `"e2e:install": "playwright install --with-deps chromium"`

## `playwright.config.ts`

- `baseURL`: `https://id-preview--f6850e11-1759-45ac-a3d1-99890b352932.lovable.app` (override por `E2E_BASE_URL`).
- `testDir: "./e2e/specs"`, `fullyParallel: false` (los flujos comparten el mismo tenant sembrado y algunos se pisan).
- `workers: 1` por defecto; `retries: process.env.CI ? 1 : 0`.
- `use`: `headless: true`, `trace: "on-first-retry"`, `screenshot: "only-on-failure"`, `video: "retain-on-failure"`.
- `globalSetup: "./e2e/global-setup.ts"`.
- Solo Chromium para el MVP.

## `global-setup.ts`

1. Carga `.env.e2e` (`dotenv.config({ path: ".env.e2e" })`).
2. Valida vars obligatorias: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `QA_TENANT_SLUG=qa-sandbox`, y las 5 `QA_*_EMAIL`/`QA_*_PASSWORD`.
3. Crea cliente supabase service_role y ejecuta en serie:
   - `select public.qa_reset('qa-sandbox');`
   - `select public.qa_seed_all();`
4. Sanity check: `select count(*) from profiles where tenant_id = (select id from tenants where slug='qa-sandbox')` → debe ser ≥ 200.
5. Aborta con error explícito si alguna RPC falla o el sanity falla.

(No usa storageState — cada test loguea su rol al inicio. Más simple y robusto frente a expiración de sesión.)

## Fixture `as(role)`

```ts
// fixtures/auth.ts (esbozo)
export const test = base.extend<{ as: (r: Role) => Promise<Page> }>({
  as: async ({ browser }, use) => {
    const open = async (role: Role) => {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await loginAs(page, role); // navega a /auth, llena email+password, espera redirect
      return page;
    };
    await use(open);
  },
});
```

`loginAs` usa `QA_<ROLE>_EMAIL/PASSWORD` y espera selector de AppShell logueado (avatar o nav principal) antes de devolver.

## Mapa de flujos → asserts clave

| # | Spec | Asserts mínimos |
|---|---|---|
| E2E-1 | crear-evento-herencia | preset `escalerilla` preseleccionado en la nueva categoría; al elegir pádel, control de modalidad muestra `dobles` y está `disabled`; tras guardar, la categoría aparece en la lista con badges `pádel/dobles`. |
| E2E-2 | permiso-organizador | `qa_org2` no ve el torneo en `/mis-torneos`; navegación directa a `/torneos/:id/admin` redirige o muestra mensaje de acceso denegado (no 200 con consola visible). |
| E2E-3 | ciclo-escalerilla | desafío creado; 3 slots propuestos por B; A confirma 1 → match queda agendado; A carga resultado; B confirma; en `/tabla` la posición de A subió respecto al snapshot inicial. Realtime: la pestaña abierta de B refleja el cambio sin recargar (`expect.poll`). |
| E2E-4 | correccion-resultado | en consola org, editar un match cerrado abre diálogo con texto "partidos dependientes"; al confirmar, el marcador en la lista cambia y la fila de standings refleja el delta esperado. |
| E2E-5 | grupos-playoff | con todos los grupos al 100%, botón "Avanzar a playoff" se habilita; tras click, aparece bracket con 8 cruces y `data-testid="bracket-round-qf"` presente. |
| E2E-6 | scoring-invalido | input set 3 = `6-3` (sin súper-TB) → toast/error con texto regex `/super[- ]?tie|set 3/i`; no aparece nuevo match en la lista. |
| E2E-7 | cierre-deadline | al cerrar, status del torneo pasa a `finalizado`; podio visible con 3 nombres; botones de edición de marcadores deshabilitados; `match_history` contiene entrada con `champion_user_id`. |
| E2E-8 | historial-reputacion | en `/mis-torneos` aparece el torneo de E2E-7 con su campeón; card de reputación muestra contadores numéricos > 0 (torneos organizados, deadlines cumplidos). |

## Orden y dependencias

Los specs corren en el orden numérico (Playwright respeta orden alfabético dentro de `testDir`). E2E-7 depende de tener un torneo escalerilla cerrable y E2E-8 lee el resultado de E2E-7, así que **no** marcamos `fullyParallel: true`. Antes de cada corrida, `globalSetup` deja el mundo limpio; entre tests no se resiembra — los tests están diseñados para no pisarse (cada uno opera sobre un torneo distinto del seed o crea el suyo propio en E2E-1).

## Variables de entorno (`.env.e2e.example`)

```env
E2E_BASE_URL=https://id-preview--f6850e11-1759-45ac-a3d1-99890b352932.lovable.app
SUPABASE_URL=https://wtqbrlcddsmbyiwsqyek.supabase.co
SUPABASE_SERVICE_ROLE_KEY=__set_locally__
QA_TENANT_SLUG=qa-sandbox

QA_ADMIN_EMAIL=
QA_ADMIN_PASSWORD=
QA_ORG_EMAIL=
QA_ORG_PASSWORD=
QA_ORG2_EMAIL=
QA_ORG2_PASSWORD=
QA_PLAYER_A_EMAIL=
QA_PLAYER_A_PASSWORD=
QA_PLAYER_B_EMAIL=
QA_PLAYER_B_PASSWORD=
```

`.env.e2e` queda en `.gitignore` (lo agrego si no está).

## README (`e2e/README.md`)

Contiene: instalación (`npm run e2e:install`), variables requeridas, comando local (`npm run e2e`), modo UI, advertencia explícita "**NO** correr contra producción ni un tenant ≠ `qa-sandbox`", y nota de que Lovable no ejecuta esta suite — corre en CI/local.

## Lo que NO hace este plan

- No modifica `qa_seed_all()` ni crea usuarios (asumido que ya existen).
- No toca código de producción ni añade `data-testid` nuevos en esta tanda — si algún selector resulta frágil al implementar, lo anoto y propongo agregar `data-testid` puntuales en un follow-up.
- No corre los tests desde Lovable; solo deja la suite lista.

## Criterios de aceptación

- `npm run e2e` en local con `.env.e2e` poblado deja los 8 specs en verde.
- E2E-2 y E2E-6 fallan la acción prohibida (asserts negativos).
- Re-ejecución consecutiva pasa igual (globalSetup resiembra).
- Cero referencias a tenants/usuarios reales en el código de tests.
