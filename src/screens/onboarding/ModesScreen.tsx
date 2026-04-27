import type React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ModesScreenProps {
	onNext: () => void;
	onSkip: () => void;
	onBack: () => void;
}

const MODES = [
	{
		icon: "👤",
		title: "Portrait",
		description: "Face framing & headroom guides",
		enabled: true,
	},
	{
		icon: "🍽️",
		title: "Food",
		description: "Perfect flat-lay angles",
		enabled: false,
	},
	{
		icon: "✈️",
		title: "Travel",
		description: "Scenery & landmark framing",
		enabled: true,
	},
	{
		icon: "👥",
		title: "Group Photo",
		description: "Everyone in the frame",
		enabled: false,
	},
];

export function ModesScreen({
	onNext,
	onSkip,
	onBack,
}: ModesScreenProps): React.JSX.Element {
	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.content}>
				<Text style={styles.stepIndicator}>Step 2 of 3</Text>

				<Text style={styles.title}>Choose Your Mode</Text>

				<Text style={styles.description}>
					Different scenes need different guidance. Pick a mode tailored to your
					subject.
				</Text>

				<View style={styles.modesGrid}>
					{MODES.map((mode) => (
						<View
							key={mode.title}
							style={[
								styles.modeCard,
								!mode.enabled && styles.modeCardDisabled,
							]}
						>
							<Text style={styles.modeIcon}>{mode.icon}</Text>
							<Text style={styles.modeTitle}>{mode.title}</Text>
							<Text style={styles.modeDescription}>{mode.description}</Text>
							{!mode.enabled && (
								<View style={styles.comingSoonBadge}>
									<Text style={styles.comingSoonText}>Coming soon</Text>
								</View>
							)}
						</View>
					))}
				</View>
			</View>

			<View style={styles.footer}>
				<TouchableOpacity style={styles.skipButton} onPress={onSkip}>
					<Text style={styles.skipText}>Skip</Text>
				</TouchableOpacity>

				<TouchableOpacity style={styles.backButton} onPress={onBack}>
					<Text style={styles.backText}>Back</Text>
				</TouchableOpacity>

				<TouchableOpacity style={styles.nextButton} onPress={onNext}>
					<Text style={styles.nextText}>Next</Text>
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000",
	},
	content: {
		flex: 1,
		paddingHorizontal: 24,
		paddingTop: 20,
	},
	stepIndicator: {
		fontSize: 14,
		color: "#666",
		marginBottom: 16,
		textTransform: "uppercase",
		letterSpacing: 1,
	},
	title: {
		fontSize: 28,
		fontWeight: "700",
		color: "#FFF",
		marginBottom: 12,
	},
	description: {
		fontSize: 16,
		color: "#999",
		lineHeight: 24,
		marginBottom: 24,
	},
	modesGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 12,
	},
	modeCard: {
		width: "47%",
		backgroundColor: "#1C1C1E",
		borderRadius: 16,
		padding: 16,
		alignItems: "center",
	},
	modeCardDisabled: {
		opacity: 0.6,
	},
	modeIcon: {
		fontSize: 32,
		marginBottom: 8,
	},
	modeTitle: {
		fontSize: 16,
		fontWeight: "600",
		color: "#FFF",
		marginBottom: 4,
	},
	modeDescription: {
		fontSize: 12,
		color: "#999",
		textAlign: "center",
	},
	comingSoonBadge: {
		marginTop: 8,
		backgroundColor: "#333",
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 4,
	},
	comingSoonText: {
		fontSize: 10,
		color: "#999",
		fontWeight: "500",
	},
	footer: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 24,
		paddingBottom: 32,
		paddingTop: 16,
	},
	skipButton: {
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	skipText: {
		color: "#999",
		fontSize: 16,
		fontWeight: "500",
	},
	backButton: {
		paddingHorizontal: 20,
		paddingVertical: 12,
	},
	backText: {
		color: "#999",
		fontSize: 16,
		fontWeight: "500",
	},
	nextButton: {
		backgroundColor: "#007AFF",
		paddingHorizontal: 24,
		paddingVertical: 14,
		borderRadius: 12,
	},
	nextText: {
		color: "#FFF",
		fontSize: 17,
		fontWeight: "600",
	},
});
