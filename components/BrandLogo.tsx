import Image from "next/image";

export default function BrandLogo({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/logo.svg"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={className}
    />
  );
}
