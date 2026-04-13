// dataBuffer.ts
// Модуль-синглтон: App.tsx пише сюди Float32Array (DOM режим),
// DomRenderer читає звідси у своєму RAF-циклі.
//
// Навмисно НЕ React state — ніяких Zustand/useState викликів.
// RAF-цикл DomRenderer перевіряє `version` щоб знати чи є нові дані.

export const dataBuffer = {
    buf:     null as Float32Array | null,
    count:   0,
    version: 0,   // інкрементується при кожному новому кадрі
}