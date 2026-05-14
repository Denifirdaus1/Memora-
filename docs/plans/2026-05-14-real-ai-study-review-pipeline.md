# Plan: Real AI Study Review Pipeline untuk Memora

## Summary
Fitur ini mengganti seluruh dummy/stub upload-review menjadi pipeline production: semua upload dalam satu `study_thread` dibaca AI, diekstrak menjadi knowledge terstruktur, diperkaya web secara terbatas, lalu dipakai untuk membuat review session 10 soal bervariasi. Flashcard tetap fitur terpisah dan scoped per thread.

## Key Changes
- Satu chat/study thread adalah ruang belajar terisolasi. Semua file upload di thread itu menjadi sumber review.
- Model default: extraction PDF/image `gpt-5.4`, web enrichment `gpt-5.4`, review generation `gpt-5.4`, chat biasa `gpt-5-mini`.
- Review memakai retrieval practice, spacing, interleaving, dan corrective feedback.
- Web enrichment aktif tapi bounded: hanya untuk gap/clarification, menyimpan citation, dan tidak mengganti sumber utama user.

## Implementation Changes
- Upload tetap ke Supabase Storage + `thread_uploads`, lalu file dibaca AI sebelum raw file dihapus.
- Tambah `source_chunks` untuk teks/visual per halaman/file dan `external_contexts` untuk web enrichment.
- Hapus `buildExtractionStub` dari production path.
- AI extraction menghasilkan structured output: topic, concepts, vocabulary, grammar, examples, misconceptions, difficulty, source refs.
- Review mengambil seluruh `knowledge_items` dalam thread dan menghasilkan 10 soal bervariasi.
- Jawaban user dinilai dengan AI feedback, lalu mastery per `knowledge_items` diperbarui.

## Test Plan
- Upload PDF/image bahasa dan materi umum.
- Pastikan `thread_uploads`, `source_chunks`, `knowledge_items`, `thread_memories`, `external_contexts`, `review_sessions`, `session_questions` terisi benar.
- Review session harus punya 10 soal valid, tidak dummy, dan bervariasi.
- Test RLS: user tidak bisa baca thread/flashcard/review user lain.
- Test error: file rusak, OCR gagal, AI schema invalid, enrichment gagal, retry aman.
- Jalankan `pnpm lint`, `pnpm test`, `pnpm build`, dan Playwright smoke.

## Assumptions
- Production path tidak boleh memakai stub/dummy.
- Supabase tetap source of truth.
- OpenAI Structured Outputs dipakai untuk schema ketat; Vercel AI SDK dipakai selama mendukung file/image flow.
