import { Text } from '@chakra-ui/react'
import { Link } from 'react-router'

import type { DepositRequest } from '@/api/schemas'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatDate, formatProgress, formatRelative, isExpired } from '@/lib/format'

export interface RequestCardProps {
  request: DepositRequest
  onCopyLink?: (request: DepositRequest) => void
}

/**
 * Carte de demande du dashboard.
 * L'echeance est formulee en relatif ("expire dans 4 jours") parce que c'est
 * l'information dont l'avocat a besoin pour decider de relancer son client.
 */
export function RequestCard({ request, onCopyLink }: RequestCardProps) {
  const expired = isExpired(request.expiresAt)

  return (
    <Card.Root density="compact">
      <Card.Header>
        <div>
          <Card.Title asChild>
            <Link to={`/requests/${request.id}`}>{request.label}</Link>
          </Card.Title>
          <Card.Meta>
            Cree le {formatDate(request.createdAt)},{' '}
            {expired ? 'expire' : `expire ${formatRelative(request.expiresAt)}`}
          </Card.Meta>
        </div>

        <StatusBadge status={request.status} size="sm" />
      </Card.Header>

      <Card.Footer>
        <Text fontSize="sm" color="fg.muted">
          {formatProgress(request.files.length, request.expectedFiles)}
        </Text>

        {onCopyLink && !expired ? (
          <Button visual="ghost" size="xs" onClick={() => onCopyLink(request)}>
            Copier le lien
          </Button>
        ) : null}
      </Card.Footer>
    </Card.Root>
  )
}
