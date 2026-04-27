import type React from "react";
import { useCallback, useState } from "react";
import { setOnboardingComplete } from "../../storage/onboarding";
import { ConceptScreen } from "./ConceptScreen";
import { ModesScreen } from "./ModesScreen";
import { PermissionsScreen } from "./PermissionsScreen";

interface OnboardingNavigatorProps {
	onOnboardingComplete: () => void;
}

type OnboardingStep = "concept" | "modes" | "permissions";

export function OnboardingNavigator({
	onOnboardingComplete,
}: OnboardingNavigatorProps): React.JSX.Element {
	const [currentStep, setCurrentStep] = useState<OnboardingStep>("concept");

	const handleComplete = useCallback(async () => {
		await setOnboardingComplete();
		onOnboardingComplete();
	}, [onOnboardingComplete]);

	const handleSkip = useCallback(async () => {
		await setOnboardingComplete();
		onOnboardingComplete();
	}, [onOnboardingComplete]);

	const goToNext = useCallback(() => {
		if (currentStep === "concept") {
			setCurrentStep("modes");
		} else if (currentStep === "modes") {
			setCurrentStep("permissions");
		}
	}, [currentStep]);

	const goToBack = useCallback(() => {
		if (currentStep === "modes") {
			setCurrentStep("concept");
		} else if (currentStep === "permissions") {
			setCurrentStep("modes");
		}
	}, [currentStep]);

	switch (currentStep) {
		case "concept":
			return <ConceptScreen onNext={goToNext} onSkip={handleSkip} />;
		case "modes":
			return (
				<ModesScreen onNext={goToNext} onSkip={handleSkip} onBack={goToBack} />
			);
		case "permissions":
			return (
				<PermissionsScreen
					onComplete={handleComplete}
					onSkip={handleSkip}
					onBack={goToBack}
				/>
			);
	}
}
