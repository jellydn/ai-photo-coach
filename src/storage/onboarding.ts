import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_COMPLETE_KEY = "@onboarding_complete";

export async function isOnboardingComplete(): Promise<boolean> {
	try {
		const value = await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY);
		return value === "true";
	} catch {
		return false;
	}
}

export async function setOnboardingComplete(): Promise<void> {
	try {
		await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
	} catch {
		// Silently fail - onboarding can be shown again if storage fails
	}
}

export async function resetOnboarding(): Promise<void> {
	try {
		await AsyncStorage.removeItem(ONBOARDING_COMPLETE_KEY);
	} catch {
		// Silently fail
	}
}
