const skin = ['#F2C9A5', '#C98E64', '#8D5A3B', '#E8B896', '#6B4128']
const hair = ['#2A1B12', '#5A3A22', '#1B1B1B', '#B5651D', '#3B2A55']
const backgrounds = ['#0F4C5C', '#D1A21C', '#8B1E2D', '#3A5A40', '#4A6FA5']
export function Avatar({
  name,
  large = false,
}: {
  name: string
  large?: boolean
}) {
  const index = name.startsWith('Mariana')
    ? 2
    : [...name].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % 5
  const color = (index * 3 + 1) % 5
  const haircut = hair[(index + 2) % 5]
  return (
    <svg
      className={`avatar ${large ? 'avatar-large' : ''}`}
      viewBox="0 0 48 48"
      aria-hidden="true"
    >
      <rect width="48" height="48" fill={backgrounds[color]} />
      <path
        d="M6 48c2-12 10-15 18-15s16 3 18 15z"
        fill={backgrounds[(color + 2) % 5]}
        opacity=".9"
      />
      <circle cx="24" cy="21" r="9" fill={skin[index]} />
      <path
        d="M14.5 20c0-8 5-10 10-10s9.5 3 9.5 10c-2-4-6-5-9-5s-8 1-10.5 5z"
        fill={haircut}
      />
      {index % 2 === 1 && (
        <path
          d="M14 20c-2 8 0 14 2 15l2-8zM34 20c2 8 0 14-2 15l-2-8z"
          fill={haircut}
        />
      )}
      <circle cx="20.5" cy="22" r="1" fill="#1B2631" />
      <circle cx="27.5" cy="22" r="1" fill="#1B2631" />
      <path
        d="M21 26q3 2 6 0"
        stroke="#1B2631"
        fill="none"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  )
}
