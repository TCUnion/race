/**
 * Generate a consistent color for a given team name.
 * Uses a hash function to map the string to a color from a predefined palette
 * or generates a hex code.
 */

// A curated list of distinct, vibrant colors suitable for dark mode UI
const TEAM_COLORS = [
    '#EF4444', // Red 500
    '#F97316', // Orange 500
    '#F59E0B', // Amber 500
    '#10B981', // Emerald 500
    '#06B6D4', // Cyan 500
    '#3B82F6', // Blue 500
    '#6366F1', // Indigo 500
    '#8B5CF6', // Violet 500
    '#D946EF', // Fuchsia 500
    '#EC4899', // Pink 500
];

export const getTeamColor = (teamName?: string): string => {
    if (!teamName) return '#64748B'; // Slate 500 (Default grey)

    let hash = 0;
    for (let i = 0; i < teamName.length; i++) {
        hash = teamName.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Use modulo to pick from the palette
    const index = Math.abs(hash) % TEAM_COLORS.length;
    return TEAM_COLORS[index];
};
