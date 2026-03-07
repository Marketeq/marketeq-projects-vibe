// frontend/src/lib/api/favorites.ts - UPDATED

const FAVORITES_API_URL = process.env.NEXT_PUBLIC_FAVORITES_API_URL || 'http://localhost:4003/favorites';

export interface Favorite {
    id: string;
    type: 'project' | 'talent' | 'job' | 'service' | 'team';
    itemId: string;
    groupId: string | null;
    userSub: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateFavoriteDto {
    type: 'project' | 'talent' | 'job' | 'service' | 'team';
    itemId: string;
    groupId?: string | null;
}

// Get all favorites for current user
export async function getAllFavorites(): Promise<Favorite[]> {
    try {
        const res = await fetch(FAVORITES_API_URL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // Add user context headers if available
                // 'x-user-sub': userSub,
                // 'x-user-id': userId,
            },
            cache: 'no-store',
        });

        if (!res.ok) {
            console.error('Failed to fetch favorites:', res.status, res.statusText);
            return [];
        }

        return res.json();
    } catch (error) {
        console.error('Error fetching favorites:', error);
        return [];
    }
}

// Add a favorite
export async function addFavorite(dto: CreateFavoriteDto): Promise<Favorite | null> {
    try {
        console.log('🔵 Adding favorite:', dto);
        
        const res = await fetch(FAVORITES_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dto),
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error('Failed to add favorite:', res.status, errorText);
            return null;
        }

        const result = await res.json();
        console.log('✅ Favorite added:', result);
        return result;
    } catch (error) {
        console.error('Error adding favorite:', error);
        return null;
    }
}

// Remove a favorite by favorite ID
export async function removeFavorite(favoriteId: string): Promise<boolean> {
    try {
        console.log('🔴 Removing favorite:', favoriteId);
        
        const res = await fetch(`${FAVORITES_API_URL}/${favoriteId}`, {
            method: 'DELETE',
        });

        const success = res.ok;
        console.log(success ? '✅ Favorite removed' : '❌ Failed to remove favorite');
        return success;
    } catch (error) {
        console.error('Error removing favorite:', error);
        return false;
    }
}

// Find favorite by itemId
export async function findFavoriteByItemId(itemId: string): Promise<Favorite | null> {
    try {
        const favorites = await getAllFavorites();
        return favorites.find(fav => fav.itemId === itemId) || null;
    } catch (error) {
        console.error('Error finding favorite:', error);
        return null;
    }
}

// Check if item is favorited
export async function isFavorited(itemId: string): Promise<boolean> {
    try {
        const favorite = await findFavoriteByItemId(itemId);
        return favorite !== null;
    } catch (error) {
        console.error('Error checking favorite status:', error);
        return false;
    }
}

// Get favorites count
export async function getFavoritesCount(): Promise<number> {
    try {
        const favorites = await getAllFavorites();
        return favorites.length;
    } catch (error) {
        console.error('Error getting favorites count:', error);
        return 0;
    }
}

// Get project favorites only
export async function getProjectFavorites(): Promise<Favorite[]> {
    try {
        const favorites = await getAllFavorites();
        return favorites.filter(fav => fav.type === 'project');
    } catch (error) {
        console.error('Error getting project favorites:', error);
        return [];
    }
}

// Get service favorites only
export async function getServiceFavorites(): Promise<Favorite[]> {
    try {
        const favorites = await getAllFavorites();
        return favorites.filter(fav => fav.type === 'service');
    } catch (error) {
        console.error('Error getting service favorites:', error);
        return [];
    }
}

// Get team favorites only
export async function getTeamFavorites(): Promise<Favorite[]> {
    try {
        const favorites = await getAllFavorites();
        return favorites.filter(fav => fav.type === 'team');
    } catch (error) {
        console.error('Error getting team favorites:', error);
        return [];
    }
}

// Get talent favorites only
export async function getTalentFavorites(): Promise<Favorite[]> {
    try {
        const favorites = await getAllFavorites();
        return favorites.filter(fav => fav.type === 'talent');
    } catch (error) {
        console.error('Error getting talent favorites:', error);
        return [];
    }
}