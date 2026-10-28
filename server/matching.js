// Nearby matching for FeedOne.
//
// The score is 0-100 and is built from simple, readable rules:
// same area is worth the most, a nearby area is worth less, servings
// that fit the NGO's need add a little, and time left before expiry
// adds the rest. The explanation is built from the same facts, in
// plain English, so the score is never a mystery number.

// Areas treated as nearby each other. Keep this list small and local.
const NEARBY_AREAS = {
  Dundigal: ['Gandi Maisamma', 'Kompally'],
  'Gandi Maisamma': ['Dundigal', 'Kompally'],
  Kompally: ['Dundigal', 'Gandi Maisamma'],
};

function hoursLeft(listing, now) {
  const expires = new Date(listing.expires_at).getTime();
  return (expires - now.getTime()) / (1000 * 60 * 60);
}

function describeTimeLeft(hours) {
  if (hours <= 0) return 'already past its expiry time';
  if (hours < 1) return 'less than 1 hour left before expiry';
  const whole = Math.floor(hours);
  return `${whole} hour${whole === 1 ? '' : 's'} left before expiry`;
}

// ngo is optional. It may have { area, peopleServed }.
// peopleServed is only used when the NGO profile provides it.
function scoreMatch(listing, ngo) {
  const now = new Date();
  const hours = hoursLeft(listing, now);
  if (hours <= 0 && listing.status === 'Available') return { score: 0, explanation: 'This listing is past its expiry time.' };

  let score = 0;
  const reasons = [];

  const listingArea = listing.area || '';
  const ngoArea = (ngo && ngo.area) || '';

  if (ngoArea && listingArea === ngoArea) {
    score += 50;
    reasons.push(`Same area (${listingArea})`);
  } else if (ngoArea && (NEARBY_AREAS[ngoArea] || []).includes(listingArea)) {
    score += 25;
    reasons.push(`Nearby area (${listingArea} is near ${ngoArea})`);
  } else if (ngoArea) {
    reasons.push(`Different area (${listingArea}, NGO is in ${ngoArea})`);
  }

  const peopleServed = ngo && Number(ngo.peopleServed);
  if (peopleServed > 0) {
    if (listing.servings <= peopleServed) {
      score += 20;
      reasons.push(`${listing.servings} servings fits the ${peopleServed} people served`);
    } else {
      score += 10;
      reasons.push(`${listing.servings} servings is more than the ${peopleServed} people served, so some may be shared onward`);
    }
  }

  if (hours > 3) {
    score += 20;
  } else if (hours > 1) {
    score += 15;
  } else if (hours > 0) {
    score += 5;
    reasons.push('expiry is very soon, so pickup must be quick');
  }

  reasons.push(describeTimeLeft(hours));

  return {
    score: Math.max(0, Math.min(100, score)),
    explanation: reasons.join(' and ') + '.',
  };
}

function explainMatch(listing, ngo) {
  return scoreMatch(listing, ngo).explanation;
}

module.exports = { scoreMatch, explainMatch, NEARBY_AREAS };
