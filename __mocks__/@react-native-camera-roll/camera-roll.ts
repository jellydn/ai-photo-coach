/**
 * Mock for @react-native-camera-roll/camera-roll
 */

export interface PhotoIdentifier {
	node: {
		id: string;
		image: {
			uri: string;
			filename: string;
			width: number;
			height: number;
		};
		timestamp: string;
	};
}

// Mock storage for testing
const mockPhotoStore: PhotoIdentifier[] = [];
let photoIdCounter = 1;

export const CameraRoll = {
	saveAsset: jest.fn(
		async (uri: string, _options?: { type?: "photo" | "video" }) => {
			const id = `photo_${photoIdCounter++}`;
			const photo: PhotoIdentifier = {
				node: {
					id,
					image: {
						uri: uri.replace("file://", ""),
						filename: uri.split("/").pop() ?? "image.jpg",
						width: 1920,
						height: 1080,
					},
					timestamp: new Date().toISOString(),
				},
			};
			mockPhotoStore.push(photo);
			return photo;
		},
	),

	deletePhotos: jest.fn(async (photoIds: string[]) => {
		for (let i = mockPhotoStore.length - 1; i >= 0; i--) {
			if (photoIds.includes(mockPhotoStore[i].node.id)) {
				mockPhotoStore.splice(i, 1);
			}
		}
		return true;
	}),

	getPhotos: jest.fn(async () => ({
		edges: mockPhotoStore,
		page_info: {
			has_next_page: false,
		},
	})),

	// Testing helpers
	__resetMocks: () => {
		mockPhotoStore.length = 0;
		photoIdCounter = 1;
		(CameraRoll.saveAsset as jest.Mock).mockClear();
		(CameraRoll.deletePhotos as jest.Mock).mockClear();
		(CameraRoll.getPhotos as jest.Mock).mockClear();
	},

	__getMockStore: () => mockPhotoStore,
};
