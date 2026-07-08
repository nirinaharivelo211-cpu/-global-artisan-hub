// @ts-nocheck
"use client"

import { getStatusBadgeClasses, getStatusBadgeFullClasses, getStatusBadgeCompactClasses } from "@/lib/statusStyles"

/**
 * Badge simple avec dot (style existant)
 */
export function StatusBadge({ status, role }: { status: string; role: 'client' | 'artisan' | 'livreur' | 'admin' }) {
  const classes = getStatusBadgeClasses(status, role);
  
  return (
    <span className={classes.container}>
      <span className={classes.dot} />
      <span className={classes.text}>{classes.label}</span>
    </span>
  );
}

/**
 * Badge complet avec fond (pour cartes)
 */
export function StatusBadgeFull({ status, role }: { status: string; role: 'client' | 'artisan' | 'livreur' | 'admin' }) {
  const classes = getStatusBadgeFullClasses(status, role);
  
  return (
    <span className={classes.container}>
      <span className={classes.dot} />
      {classes.label}
    </span>
  );
}

/**
 * Badge pour tableaux (compact)
 */
export function StatusBadgeCompact({ status, role }: { status: string; role: 'client' | 'artisan' | 'livreur' | 'admin' }) {
  const classes = getStatusBadgeCompactClasses(status, role);
  
  return (
    <span className={classes.container}>
      {classes.label}
    </span>
  );
}
