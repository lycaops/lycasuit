import Loader from "@/components/Loader";

export default function Loading() {
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
      <Loader size={128} />
    </div>
  );
}