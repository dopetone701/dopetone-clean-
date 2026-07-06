export function goToLicence(beat) {
  if (!beat || !beat.id) return;
  window.location.href = `license.html?id=${beat.id}`;
}
