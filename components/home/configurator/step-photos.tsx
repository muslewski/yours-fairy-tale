import { PhotoDropzone } from "./photo-dropzone";

export function StepPhotos({ summary }: { summary: string }) {
  return (
    <div>
      <h3 className="font-[family-name:var(--font-fredoka)] text-xl font-semibold text-brand-deep">Almost there</h3>
      <p className="mt-2 text-sm font-medium text-brand-deep/60">{summary}</p>
      <PhotoDropzone />
    </div>
  );
}
