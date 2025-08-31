import fs from "fs/promises";
import path from "path";

function randomString(len = 8) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export async function saveUploadedImage(fileLike: any, folder: "users" | "students" = "users"): Promise<string> {
  // Duck-typing: expect arrayBuffer, size, type/name
  if (!fileLike || typeof fileLike.arrayBuffer !== "function") throw new Error("Invalid file");
  const type = String(fileLike.type || "");
  const size = Number(fileLike.size || 0);
  const originalName = String(fileLike.name || "");

  if (!type.startsWith("image/") && !/\.(jpe?g|png|webp|gif)$/i.test(originalName)) {
    throw new Error("Only image uploads are allowed");
  }
  if (size > 8 * 1024 * 1024) throw new Error("Image too large (max 8MB)");

  const ext = (() => {
    if (type) {
      const m = /[^/]+\/(.+)/.exec(type);
      const guessed = m?.[1]?.toLowerCase() || "";
      if (guessed.includes("jpeg")) return "jpg";
      if (guessed.includes("png")) return "png";
      if (guessed.includes("webp")) return "webp";
      if (guessed.includes("gif")) return "gif";
      if (guessed) return guessed.replace(/[^a-z0-9]/g, "").slice(0, 5);
    }
    const fromName = path.extname(originalName).replace(/^\./, "");
    return fromName || "img";
  })();
  const filename = `${folder}-${Date.now()}-${randomString(6)}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
  await fs.mkdir(uploadDir, { recursive: true });
  const arrayBuffer = await fileLike.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);
  await fs.writeFile(path.join(uploadDir, filename), buf);
  return `/uploads/${folder}/${filename}`;
}
