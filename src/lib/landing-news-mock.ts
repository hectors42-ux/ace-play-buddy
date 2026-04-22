// Mock estático de noticias para el landing público.
// Cuando exista CMS, reemplazar por fetch a backend.

import newsSub14 from "@/assets/landing/news-sub14.jpg";
import newsOdaset from "@/assets/landing/news-odaset.jpg";
import newsClinica from "@/assets/landing/news-clinica.jpg";
import newsCopa from "@/assets/landing/news-copa.jpg";

export interface LandingNewsItem {
  slug: string;
  title: string;
  excerpt: string;
  date: string; // ISO
  category: "Academia" | "Torneos" | "Comunidad" | "Club";
  image: string;
  body: string[]; // párrafos
}

export const LANDING_NEWS: LandingNewsItem[] = [
  {
    slug: "sub14-representa-a-chile",
    title: "Sub-14 representa a Chile en Sudamericano",
    excerpt:
      "Samantha Álvarez y Miguel Vergara entrenaron en el club para el Sudamericano de Armenia, Colombia.",
    date: "2025-09-12",
    category: "Academia",
    image: newsSub14,
    body: [
      "Dos jugadores formados en la academia del Club de Tenis Providencia fueron convocados a la selección chilena Sub-14 que disputó el Sudamericano de Armenia, Colombia.",
      "Samantha Álvarez y Miguel Vergara cumplieron una participación destacada, en una semana en la que las canchas de arcilla del centro deportivo colombiano pusieron a prueba el trabajo realizado durante todo el año en el club.",
      "Su preparación incluyó dobles sesiones físicas y técnicas, sparrings con jugadores adultos y un plan táctico personalizado por el equipo de coaches del club.",
    ],
  },
  {
    slug: "campeonas-sudamericanas-odaset",
    title: "Campeonas Sudamericanas damas senior",
    excerpt:
      "Marta Ariztía, Laura Donoso y Verónica Kohnenkamp ganan el torneo continental ODASET damas senior.",
    date: "2025-08-04",
    category: "Torneos",
    image: newsOdaset,
    body: [
      "El equipo chileno representado por tres socias del Club de Tenis Providencia se coronó campeón del torneo Sudamericano ODASET en categoría damas senior.",
      "La final fue ante Argentina, en una serie de tres partidos que se definió en el último dobles. La preparación de varios meses en las canchas del club rindió frutos con un título histórico para Chile en la categoría.",
    ],
  },
  {
    slug: "clinica-tenis-inclusivo",
    title: "Clínica de tenis inclusivo con Alto Tenis",
    excerpt:
      "Junto a Alto Tenis y Fundación Abrazo de Gol, primera clínica para jóvenes con discapacidad intelectual.",
    date: "2025-07-21",
    category: "Comunidad",
    image: newsClinica,
    body: [
      "El club abrió sus canchas a 24 jóvenes con discapacidad intelectual en la primera clínica de tenis inclusivo organizada junto a Alto Tenis y la Fundación Abrazo de Gol.",
      "Durante una mañana, profesores del club y voluntarios trabajaron en estaciones técnicas adaptadas para que cada participante pudiera vivir el tenis a su ritmo. La iniciativa se repetirá trimestralmente.",
    ],
  },
  {
    slug: "copa-milienko-karaciolo",
    title: "Copa Milienko Karaciolo: 35° edición",
    excerpt:
      "Torneo interno tradicional con categorías singles y dobles, damas y varones, de febrero a abril.",
    date: "2025-04-30",
    category: "Torneos",
    image: newsCopa,
    body: [
      "La Copa Milienko Karaciolo cumple 35 ediciones consecutivas como uno de los torneos internos con más historia del club.",
      "Más de 120 socios participaron en las categorías singles y dobles, damas y varones, en una temporada que se extendió por tres meses con partidos cada fin de semana.",
    ],
  },
];

export const getNewsBySlug = (slug: string): LandingNewsItem | undefined =>
  LANDING_NEWS.find((n) => n.slug === slug);

export const formatNewsDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
};
