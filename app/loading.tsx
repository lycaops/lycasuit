import Loader from "@/components/Loader";

export default function Loading() {
  return (
    <div className="grid min-h-dvh place-items-center bg-[#f4f7fb]">
      <Loader size={128} />
    </div>
  );
}