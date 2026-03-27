interface Props {
  url: string
}

export function ImageCard({ url }: Props) {
  return (
    <div className="w-full h-full">
      <img
        src={url}
        alt=""
        className="w-full h-full object-cover"
        draggable={false}
        onPointerDown={(e) => e.stopPropagation()}
      />
    </div>
  )
}
