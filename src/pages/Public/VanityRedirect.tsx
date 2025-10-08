import React, { useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { decodeShareCodeToShareId } from '../../utils/shortLink';

const VanityRedirect: React.FC = () => {
  const { vanity } = useParams<{ vanity: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!vanity) return;

    // Determine if this is a project or proposal based on the path
    const isProposal = location.pathname.startsWith('/pr/');
    const entityType = isProposal ? 'proposal' : 'project';
    const marker = isProposal ? '-pr-' : '-p-';
    const codePrefix = isProposal ? 'pr-' : 'p-';

    // Expect vanity like: <slug>-p-<A>-<B>-<C> or <slug>-pr-<A>-<B>-<C>
    const idx = vanity.lastIndexOf(marker);
    if (idx === -1) {
      // Fallback: try to treat entire vanity as shareId (best effort)
      navigate(`/shared/${entityType}/${vanity}`, { replace: true });
      return;
    }

    const code = codePrefix + vanity.slice(idx + marker.length);
    const shareId = decodeShareCodeToShareId(code);

    if (shareId) {
      navigate(`/shared/${entityType}/${shareId}`, { replace: true });
    } else {
      // Fallback to raw; Shared page will show Not Found if invalid
      navigate(`/shared/${entityType}/${vanity}`, { replace: true });
    }
  }, [vanity, navigate, location.pathname]);

  return null;
};

export default VanityRedirect;