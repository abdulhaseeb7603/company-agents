export function generateCaddyfile(domain: string): string {
  return `${domain} {
    reverse_proxy paperclip:3100
}
`;
}
