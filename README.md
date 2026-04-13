# SSR / CSR / SSG Benchmark Layout

Проєкт реалізовано на **Next.js** для порівняння трьох підходів в одному кодовому базисі:

- `/csr` — клієнтське завантаження даних після mount
- `/ssr` — серверний рендер на кожен запит
- `/ssg` — статична генерація під час build

## Швидкий старт

```bash
npm install
npm run dev
```

Відкрити:

- `http://localhost:3000/benchmark` — Benchmark Control
- `http://localhost:3000/csr/small`
- `http://localhost:3000/ssr/small`
- `http://localhost:3000/ssg/small`

## Що уніфіковано для чесного порівняння

- Один і той самий generator dataset (`lib/benchmark.ts`)
- Один і той самий компонент візуалізації (`components/benchmark/DatasetView.tsx`)
- Однакова структура DOM і UI для всіх трьох сторінок
- Різниця тільки у способі отримання/рендеру даних

## Payload режими

- `small`
- `medium`
- `large`

Для SSR/CSR/SSG доступні однакові payload маршрути: `/{mode}/{size}`.

## Метрики (overlay + лог)

На сторінках сценаріїв збираються:

- TTFB
- FCP
- LCP
- TTI (approx)
- CLS
- Hydration time
- JS bundle size (resource timing)
- API requests

Метрики показуються в overlay і записуються у `localStorage` (`benchmark.logs`).

## Benchmark Control

Сторінка `/benchmark` дозволяє:

- обрати підхід (`all`, `csr`, `ssr`, `ssg`)
- обрати payload (`small`, `medium`, `large`)
- запустити серію 5–10 прогонів
- отримати медіану та P90
- експортувати результати в JSON/CSV

## Рекомендований стенд для стабільності

- фіксована машина/браузер
- без сторонніх фонових задач
- 5–10 прогонів на сценарій
- оцінювати медіану та percentile, а не одиничний замір

## Обмеження експерименту

- TTI є наближенням на базі browser idle/event timing
- JS bundle size залежить від кешу/режиму (dev/prod)
- API request count у browser не включає внутрішні серверні виклики
