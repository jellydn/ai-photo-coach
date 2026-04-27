import type React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ConceptScreenProps {
	onNext: () => void;
	onSkip: () => void;
}

export function ConceptScreen({
	onNext,
	onSkip,
}: ConceptScreenProps): React.JSX.Element {
	return (
		<SafeAreaView style={styles.container}>
			<View style={styles.content}>
				<View style={styles.iconContainer}>
					<Text style={styles.icon}>📸</Text>
				</View>

				<Text style={styles.title}>AI Photo Coach</Text>

				<Text style={styles.description}>
					Get real-time guidance to take better photos. Our AI analyzes your
					composition, lighting, and stability to help you capture the perfect
					shot every time.
				</Text>

				<View style={styles.featureList}>
					<View style={styles.featureItem}>
						<Text style={styles.featureIcon}>🎯</Text>
						<Text style={styles.featureText}>Smart composition guides</Text>
					</View>
					<View style={styles.featureItem}>
						<Text style={styles.featureIcon}>💡</Text>
						<Text style={styles.featureText}>Lighting analysis</Text>
					</View>
					<View style={styles.featureItem}>
						<Text style={styles.featureIcon}>🤖</Text>
						<Text style={styles.featureText}>Auto-capture when ready</Text>
					</View>
				</View>
			</View>

			<View style={styles.footer}>
				<TouchableOpacity style={styles.skipButton} onPress={onSkip}>
					<Text style={styles.skipText}>Skip</Text>
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
		justifyContent: "center",
		alignItems: "center",
		paddingHorizontal: 32,
	},
	iconContainer: {
		marginBottom: 24,
	},
	icon: {
		fontSize: 80,
	},
	title: {
		fontSize: 32,
		fontWeight: "700",
		color: "#FFF",
		marginBottom: 16,
		textAlign: "center",
	},
	description: {
		fontSize: 16,
		color: "#999",
		textAlign: "center",
		lineHeight: 24,
		marginBottom: 40,
	},
	featureList: {
		width: "100%",
		gap: 16,
	},
	featureItem: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#1C1C1E",
		padding: 16,
		borderRadius: 12,
	},
	featureIcon: {
		fontSize: 24,
		marginRight: 12,
	},
	featureText: {
		fontSize: 16,
		color: "#FFF",
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
		paddingHorizontal: 20,
		paddingVertical: 12,
	},
	skipText: {
		color: "#999",
		fontSize: 16,
		fontWeight: "500",
	},
	nextButton: {
		backgroundColor: "#007AFF",
		paddingHorizontal: 32,
		paddingVertical: 14,
		borderRadius: 12,
	},
	nextText: {
		color: "#FFF",
		fontSize: 17,
		fontWeight: "600",
	},
});
