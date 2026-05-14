import { Lock } from 'lucide-react'

export interface MemberCardData {
  id: string
  position: string | null
  company: string | null
  industry: string | null
  bio: string | null
  telegramUsername: string | null
  phone: string | null
  user: { id: string; name: string; avatarUrl: string | null }
}

interface Props {
  member: MemberCardData
  /** Контакты показываются только при active membership. */
  canSeeContacts: boolean
}

export function MemberCard({ member, canSeeContacts }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md transition">
      <div className="flex items-center gap-4">
        <Avatar src={member.user.avatarUrl} name={member.user.name} />
        <div className="min-w-0">
          <h3 className="font-semibold truncate">{member.user.name}</h3>
          {(member.position || member.company) && (
            <p className="text-sm text-slate-500 truncate">
              {[member.position, member.company].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </div>

      {member.industry && (
        <span className="mt-3 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs">
          {member.industry}
        </span>
      )}

      {member.bio && (
        <p className="mt-3 text-sm text-slate-600 line-clamp-3">{member.bio}</p>
      )}

      <div className="mt-4 border-t pt-3">
        {canSeeContacts ? (
          <div className="space-y-1 text-sm">
            {member.telegramUsername && (
              <a
                href={`https://t.me/${member.telegramUsername}`}
                target="_blank"
                rel="noreferrer"
                className="text-brand hover:underline block"
              >
                @{member.telegramUsername}
              </a>
            )}
            {member.phone && (
              <a href={`tel:${member.phone}`} className="text-slate-700 hover:underline block">
                {member.phone}
              </a>
            )}
            {!member.telegramUsername && !member.phone && (
              <span className="text-slate-400">контакты не указаны</span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Lock className="size-4" />
            <span>Контакты доступны при активном членстве</span>
          </div>
        )}
      </div>
    </div>
  )
}

function Avatar({ src, name }: { src: string | null; name: string }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className="size-14 rounded-full object-cover bg-slate-100"
      />
    )
  }
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
  return (
    <div className="size-14 rounded-full bg-brand text-white flex items-center justify-center font-semibold">
      {initials}
    </div>
  )
}
