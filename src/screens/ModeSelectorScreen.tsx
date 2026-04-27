import type React from "react";
import {
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getModeMetadata } from "../config/modeMetadata";
import { isModeEnabled, MODES, type Mode } from "../config/modes";

interface ModeSelectorScreenProps {
	onModeSelected: (mode: Mode) => void;
}

export function ModeSelectorScreen({
	onModeSelected,
}: ModeSelectorScreenProps): React.JSX.Element {
	const handleModePress = (mode: Mode) => {
		if (isModeEnabled(mode)) {
			onModeSelected(mode);
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.title}>Choose a Mode</Text>
				<Text style={styles.subtitle}>
					Select a shooting mode for tailored guidance
				</Text>
			</View>

			<ScrollView style={styles.scrollView} contentContainerStyle={styles.grid}>
				{MODES.map((mode) => {
					const metadata = getModeMetadata(mode);
					const enabled = isModeEnabled(mode);

					return (
						<TouchableOpacity
							key={mode}
							style={[styles.modeCard, !enabled && styles.modeCardDisabled]}
							onPress={() => handleModePress(mode)}
							activeOpacity={enabled ? 0.7 : 1}
							testID={`mode-card-${mode}`}
							accessibilityLabel={metadata.title}
							accessibilityHint={
								enabled
									? `Double tap to select ${metadata.title} mode`
									: `${metadata.title} mode is coming soon`
							}
							accessibilityState={{ disabled: !enabled }}
						>
							<Text style={styles.modeIcon}>{metadata.icon}</Text>
							<Text style={styles.modeTitle}>{metadata.title}</Text>
							<Text style={styles.modeDescription}>{metadata.description}</Text>
							{!enabled && (
								<View style={styles.comingSoonBadge}>
									<Text style={styles.comingSoonText}>Coming soon</Text>
								</View>
							)}
						</TouchableOpacity>
					);
				})}
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#000",
	},
	header: {
		paddingHorizontal: 24,
		paddingTop: 20,
		paddingBottom: 16,
	},
	title: {
		fontSize: 28,
		fontWeight: "700",
		color: "#FFF",
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 16,
		color: "#999",
	},
	scrollView: {
		flex: 1,
	},
	grid: {
		flexDirection: "row",
		flexWrap: "wrap",
		paddingHorizontal: 16,
		paddingBottom: 24,
		gap: 12,
		justifyContent: "space-between",
	},
	modeCard: {
		width: "47%",
		backgroundColor: "#1C1C1E",
		borderRadius: 16,
		padding: 16,
		alignItems: "center",
		marginBottom: 4,
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
		textAlign: "center",
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
});
