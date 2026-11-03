/**
 * RemoteImage — a drop-in <Image> that self-heals CashKaro CDN host mismatches.
 *
 * CashKaro serves each store/banner asset from EITHER asset11.ckassets.com OR
 * asset21.ckassets.com — and which host has a given file is per-image, not
 * uniform: some images 200 on asset11 and 403 on asset21, others the reverse
 * (verified across the offers catalogue). So no single host rewrite can be
 * correct for the whole set — a fixed swap just trades which half breaks.
 *
 * This component tries the URI as given and, on a load error, retries ONCE on
 * the other ckassets host. Whichever host actually has the file wins, so every
 * tile resolves regardless of where the asset lives. Non-ckassets URIs and
 * local (require'd) sources pass straight through, behaving exactly like Image.
 */
import React from 'react';
import { Image, type ImageProps } from 'react-native';

const CK_HOST_RE = /asset\d+\.ckassets\.com/i;
const HOST_A = 'asset21.ckassets.com';
const HOST_B = 'asset11.ckassets.com';

/** Same URI on the OTHER ckassets host; null if it isn't a ckassets URL. */
function alternateHost(uri: string): string | null {
  const match = uri.match(CK_HOST_RE);
  if (!match) return null;
  const next = match[0].toLowerCase() === HOST_A ? HOST_B : HOST_A;
  return uri.replace(CK_HOST_RE, next);
}

export function RemoteImage({ source, onError, ...rest }: ImageProps) {
  const uri =
    source && typeof source === 'object' && !Array.isArray(source) && 'uri' in source
      ? (source as { uri?: string }).uri
      : undefined;

  const [current, setCurrent] = React.useState<string | undefined>(uri);
  const triedAlternate = React.useRef(false);

  // Reset when the incoming URI changes (e.g. tile recycled to another store).
  React.useEffect(() => {
    setCurrent(uri);
    triedAlternate.current = false;
  }, [uri]);

  // Local assets / non-ckassets URLs: behave exactly like a plain Image.
  if (!uri || !CK_HOST_RE.test(uri)) {
    return <Image source={source} onError={onError} {...rest} />;
  }

  return (
    <Image
      source={{ uri: current }}
      onError={(e) => {
        if (!triedAlternate.current && current) {
          const alt = alternateHost(current);
          if (alt && alt !== current) {
            triedAlternate.current = true;
            setCurrent(alt);
            return;
          }
        }
        onError?.(e);
      }}
      {...rest}
    />
  );
}
