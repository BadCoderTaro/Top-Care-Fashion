import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
  ScrollView as RNScrollView,
  FlatList,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import type { TextInput as RNTextInput } from "react-native";
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from "expo-image-manipulator";
import Icon from "../../../components/Icon";
import Header from "../../../components/Header";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import type { MyTopStackParamList } from "./index";
import { listingsService } from "../../../src/services/listingsService";
import type { ListingItem } from "../../../types/shop";
import { sortCategories } from "../../../utils/categoryHelpers";
import { checkImagesSFW } from "../../../src/services/aiService";

/** --- Options --- */
const BRAND_OPTIONS = [
  "Nike",
  "Adidas",
  "Zara",
  "H&M",
  "Uniqlo",
  "Levi's",
  "Converse",
  "Calvin Klein",
  "New Balance",
  "Puma",
  "Under Armour",
  "Gucci",
  "Prada",
  "Chanel",
  "The North Face",
  "Dr. Martens",
  "Brandy Melville",
  "Off-White",
  // 奢侈品牌
  "Louis Vuitton",
  "Hermès",
  "Dior",
  "Versace",
  "Burberry",
  "Balenciaga",
  "Saint Laurent",
  "Fendi",
  "Givenchy",
  "Valentino",
  "Bottega Veneta",
  "Celine",
  "Loewe",
  "Miu Miu",
  "Alexander McQueen",
  "Tom Ford",
  "Dolce & Gabbana",
  "Armani",
  "Ralph Lauren",
  // 快时尚品牌
  "Forever 21",
  "ASOS",
  "Topshop",
  "Mango",
  "Pull & Bear",
  "Bershka",
  "Stradivarius",
  "COS",
  "Arket",
  "Weekday",
  "Monki",
  "& Other Stories",
  "Urban Outfitters",
  "American Eagle",
  "Abercrombie & Fitch",
  "Hollister",
  "Gap",
  "Old Navy",
  "Banana Republic",
  "Aritzia",
  // 运动品牌
  "Reebok",
  "Vans",
  "Fila",
  "ASICS",
  "Mizuno",
  "Salomon",
  "Columbia",
  "Patagonia",
  "Arc'teryx",
  "Lululemon",
  "Athleta",
  "Gymshark",
  "Alo Yoga",
  "On Running",
  "Allbirds",
  "Veja",
  // 街头/潮牌
  "Supreme",
  "Bape",
  "Stussy",
  "Palace",
  "Kith",
  "Fear of God",
  "Yeezy",
  "Travis Scott",
  "Vlone",
  "Anti Social Social Club",
  "Noah",
  "Carhartt WIP",
  "Dickies",
  "Champion",
  "Kappa",
  "Ellesse",
  // 设计师品牌
  "Acne Studios",
  "Issey Miyake",
  "Comme des Garçons",
  "Maison Margiela",
  "Rick Owens",
  "Yohji Yamamoto",
  "Vivienne Westwood",
  "Kenzo",
  "Moschino",
  "Marni",
  "Jil Sander",
  "Stella McCartney",
  // 其他知名品牌
  "Tommy Hilfiger",
  "Lacoste",
  "Polo Ralph Lauren",
  "Hugo Boss",
  "Diesel",
  "Guess",
  "Michael Kors",
  "Coach",
  "Kate Spade",
  "Tory Burch",
  "Longchamp",
  "Furla",
  "MCM",
  "Goyard",
  "Mansur Gavriel",
  "Staud",
  "Reformation",
  "Everlane",
  "Madewell",
  "Free People",
  "Anthropologie",
  "J.Crew",
  "Club Monaco",
  "Vince",
  "Theory",
  "Equipment",
  "Eileen Fisher",
  "AllSaints",
  "The Kooples",
  "Sandro",
  "Maje",
  "Ba&sh",
  "Sezane",
  "Rouje",
  "Realisation Par",
  "With Jéan",
  "Ganni",
  "Stine Goya",
  "Rotate",
  "Nanushka",
  "Totême",
  "Other",
];
const CONDITION_OPTIONS = ["Brand New", "Like new", "Good", "Fair", "Poor"];
const SIZE_OPTIONS_CLOTHES = [
  "XXS",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "XXXL",
  "Free Size",
  "Other",
];
const SIZE_OPTIONS_SHOES = [
  "35",
  "36",
  "37",
  "38",
  "39",
  "40",
  "41",
  "42",
  "43",
  "44",
  "45",
  "Other",
];
const SIZE_OPTIONS_ACCESSORIES = [
  "One Size",
  "Small",
  "Medium",
  "Large",
];
const MATERIAL_OPTIONS = [
  "Cotton",
  "Polyester",
  "Denim",
  "Leather",
  "Faux Leather",
  "Wool",
  "Silk",
  "Linen",
  "Nylon",
  "Spandex / Elastane",
  "Canvas",
  "Suede",
  "Velvet",
  "Acrylic",
  "Cashmere",
  "Rayon / Viscose",
  "Other",
];
const SHIPPING_OPTIONS = [
  "Free shipping", 
  "Buyer pays – $5 (island-wide)", 
  "Buyer pays – fixed fee", 
  "Meet-up"
];
const GENDER_OPTIONS = ["Men", "Women", "Unisex"];
const DEFAULT_TAGS = [
  "Vintage",
  "Y2K",
  "Streetwear",
  "Preloved",
  "Minimal",
  "Sporty",
  "Elegant",
  "Retro",
  "Casual",
  "Outdoor",
  "Grunge",
  "Coquette",
  "Cottagecore",
  "Punk",
  "Cyberpunk",
];

const PHOTO_LIMIT = 9;

type PhotoItem = {
  id: string;
  localUri: string;
  remoteUrl?: string;
  uploading: boolean;
  error?: string;
};

/** --- Picker modal --- */
function OptionPicker({
  title,
  visible,
  options,
  value,
  onClose,
  onSelect,
}: {
  title: string;
  visible: boolean;
  options: string[];
  value: string;
  onClose: () => void;
  onSelect: (value: string) => void;
}) {
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.sheetMask} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>{title}</Text>
        <RNScrollView style={{ maxHeight: 360 }}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[
                styles.optionRow,
                value === opt && {
                  backgroundColor: "#F3E8FF",
                  borderColor: "#5B21B6",
                },
              ]}
              onPress={() => {
                onSelect(opt);
                onClose();
              }}
            >
              <Text style={styles.optionText}>{opt}</Text>
              {value === opt ? <Text style={{ color: "#5B21B6" }}>✓</Text> : null}
            </TouchableOpacity>
          ))}
        </RNScrollView>
        <TouchableOpacity style={styles.sheetCancel} onPress={onClose}>
          <Text style={{ fontWeight: "600" }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

export default function EditListingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MyTopStackParamList>>();
  const route = useRoute<RouteProp<MyTopStackParamList, "EditListing">>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [listing, setListing] = useState<ListingItem | null>(null);

  // Dynamic categories loaded from database
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // ✅ 表单状态
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Select");
  const [brand, setBrand] = useState("");
  const [condition, setCondition] = useState("Select");
  const [size, setSize] = useState("Select");
  const [customSize, setCustomSize] = useState("");
  const [material, setMaterial] = useState("Select");
  const [customMaterial, setCustomMaterial] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1"); // 🔥 库存数量，默认为1
  const [shippingOption, setShippingOption] = useState("Select");
  const [shippingFee, setShippingFee] = useState("");
  const [location, setLocation] = useState("");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [gender, setGender] = useState("Select");
  const [tags, setTags] = useState<string[]>([]);
  const customSizeInputRef = useRef<RNTextInput | null>(null);
  const customMaterialInputRef = useRef<RNTextInput | null>(null);
  const brandCustomInputRef = useRef<RNTextInput | null>(null);
  const shouldFocusSizeInput = useRef(false);
  const shouldFocusMaterialInput = useRef(false);
  const shouldFocusBrandInput = useRef(false);
  const [brandCustom, setBrandCustom] = useState("");
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const scrollViewRef = useRef<RNScrollView>(null);
  const [moderationChecking, setModerationChecking] = useState(false);

  // Load categories from database
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoriesLoading(true);
        const data = await listingsService.getCategories();
        const allCategories = new Set<string>();
        Object.values(data).forEach((genderData) => {
          Object.keys(genderData).forEach((cat) => {
            allCategories.add(cat);
          });
        });
        const sorted = sortCategories(Array.from(allCategories));
        setCategoryOptions(sorted);
      } catch (error) {
        console.error("Failed to load categories:", error);
        setCategoryOptions([]);
      } finally {
        setCategoriesLoading(false);
      }
    };
    loadCategories();
  }, []);

  // ✅ 获取listing数据
  useEffect(() => {
    const fetchListing = async () => {
      try {
        const listingId = route.params?.listingId;
        if (!listingId) {
          Alert.alert("Error", "No listing ID provided");
          navigation.goBack();
          return;
        }

        console.log("📖 Fetching listing for editing:", listingId);
        const listingData = await listingsService.getListingById(listingId);
        
        if (listingData) {
          setListing(listingData);
          // ✅ 填充表单数据
          setTitle(listingData.title || "");
          setDescription(listingData.description || "");
          setCategory(listingData.category || "Select");
          setBrand(listingData.brand || "");
          setCondition(listingData.condition || "Select");

          const incomingSize = listingData.size?.trim() ?? "";
          const allSizeOptions = [
            ...SIZE_OPTIONS_CLOTHES,
            ...SIZE_OPTIONS_SHOES,
            ...SIZE_OPTIONS_ACCESSORIES,
          ];
          if (incomingSize && allSizeOptions.includes(incomingSize)) {
            setSize(incomingSize);
          } else if (incomingSize) {
            setSize("Other");
          } else {
            setSize("Select");
          }

          const incomingMaterial = listingData.material?.trim() ?? "";
          if (incomingMaterial && MATERIAL_OPTIONS.includes(incomingMaterial)) {
            setMaterial(incomingMaterial);
          } else if (incomingMaterial) {
            setMaterial("Other");
          } else {
            setMaterial("Select");
          }

          setPrice(listingData.price != null ? listingData.price.toString() : "");
          setQuantity(listingData.availableQuantity != null ? listingData.availableQuantity.toString() : "1"); // 🔥 加载库存数量
          const normalizedGender = listingData.gender ? listingData.gender.toLowerCase() : "";
          const matchedGender = GENDER_OPTIONS.find(
            (opt) => opt.toLowerCase() === normalizedGender
          );
          setGender(matchedGender || "Unisex");
          setShippingOption(listingData.shippingOption || "Select");
          setShippingFee(listingData.shippingFee ? listingData.shippingFee.toString() : "");
          setLocation(listingData.location || "");
          const remoteImages = Array.isArray(listingData.images)
            ? listingData.images.filter((uri) => typeof uri === "string" && uri.trim().length > 0)
            : [];
          setPhotos(
            remoteImages.map((uri, index) => ({
              id: `${listingData.id}-${index}`,
              localUri: uri,
              remoteUrl: uri,
              uploading: false,
            }))
          );
          setTags(listingData.tags || []);
          console.log("✅ Listing loaded for editing:", listingData.title);
        } else {
          Alert.alert("Error", "Listing not found");
          navigation.goBack();
        }
      } catch (error) {
        console.error("❌ Error fetching listing:", error);
        Alert.alert("Error", "Failed to load listing");
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [route.params?.listingId, navigation]);

  // ✅ 保存更改
  // 🔥 提取验证逻辑为共享函数
  const validateAndBuildPayload = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert("Missing Information", "Please add a title");
      return null;
    }

    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      Alert.alert("Missing Information", "Please add a description");
      return null;
    }

    if (!category || category === "Select") {
      Alert.alert("Missing Information", "Please select a category");
      return null;
    }

    if (!condition || condition === "Select") {
      Alert.alert("Missing Information", "Please select a condition");
      return null;
    }

    if (!price.trim()) {
      Alert.alert("Missing Information", "Please enter a price");
      return null;
    }

    const parsedPrice = parseFloat(price);
    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      Alert.alert("Invalid Price", "Please enter a valid price");
      return null;
    }

    // 🔥 验证库存数量
    const parsedQuantity = parseInt(quantity || "1", 10);
    if (isNaN(parsedQuantity) || parsedQuantity < 1) {
      Alert.alert("Invalid Quantity", "Stock quantity must be at least 1");
      return null;
    }

    if (!shippingOption || shippingOption === "Select") {
      Alert.alert("Missing Information", "Please select a shipping option");
      return null;
    }

    if (!gender || gender === "Select") {
      Alert.alert("Missing Information", "Please select a gender");
      return null;
    }

    const resolvedSize = size && size !== "Select" ? size : null;
    const resolvedMaterial = material && material !== "Select" ? material : "Polyester";
    const trimmedBrand = brand.trim();
    const resolvedGender = gender && gender !== "Select" ? gender.toLowerCase() : "unisex";

    let resolvedShippingFee: number | undefined;
    if (shippingOption === "Buyer pays – fixed fee") {
      if (!shippingFee.trim()) {
        Alert.alert("Missing Information", "Please enter a shipping fee");
        return null;
      }
      resolvedShippingFee = parseFloat(shippingFee);
      if (Number.isNaN(resolvedShippingFee) || resolvedShippingFee < 0) {
        Alert.alert("Invalid Shipping Fee", "Please enter a valid shipping fee");
        return null;
      }
    } else if (shippingFee.trim()) {
      const parsedFee = parseFloat(shippingFee);
      if (!Number.isNaN(parsedFee)) {
        resolvedShippingFee = parsedFee;
      }
    }

    const trimmedLocation = location.trim();
    if (shippingOption === "Meet-up" && !trimmedLocation) {
      Alert.alert("Missing Information", "Please enter a meet-up location");
      return null;
    }

    if (photos.some((photo) => photo.uploading)) {
      Alert.alert("Uploading", "Please wait for all photos to finish uploading.");
      return null;
    }

    const uploadedImages = photos
      .map((photo) => photo.remoteUrl)
      .filter((uri): uri is string => typeof uri === "string" && uri.trim().length > 0);

    if (photos.length && uploadedImages.length !== photos.length) {
      Alert.alert("Processing Images", "Images are still being processed. Please try again shortly.");
      return null;
    }

    const updateData = {
      title: trimmedTitle,
      description: trimmedDescription,
      price: parsedPrice,
      quantity: parsedQuantity, // 🔥 库存数量
      brand: trimmedBrand,
      size: resolvedSize,
      condition,
      material: resolvedMaterial,
      category,
      gender: resolvedGender,
      images: uploadedImages,
      tags,
      shippingOption,
      shippingFee: resolvedShippingFee,
      location: shippingOption === "Meet-up" ? trimmedLocation : undefined,
    };

    // Calculate shipping fee from preset options
    let calculatedShippingFee: number | undefined;
    try {
      if (typeof shippingOption === "string" && shippingOption.includes("$3")) {
        calculatedShippingFee = 3;
      } else if (typeof shippingOption === "string" && shippingOption.includes("$5")) {
        calculatedShippingFee = 5;
      } else if (shippingOption === "Buyer pays – fixed fee" && shippingFee) {
        const parsed = parseFloat(shippingFee);
        if (!Number.isNaN(parsed)) calculatedShippingFee = parsed;
      } else if (shippingOption === "Free shipping" || shippingOption === "Meet-up") {
        calculatedShippingFee = 0;
      }
    } catch (e) {
      console.warn("Failed to calculate preset shipping fee", e);
    }

    return {
      ...updateData,
      shippingFee: calculatedShippingFee !== undefined ? calculatedShippingFee : updateData.shippingFee,
      title: trimmedTitle,
      description: trimmedDescription,
      price: parsedPrice,
      quantity: parsedQuantity, // 🔥 确保 quantity 被包含
      brand: trimmedBrand,
      gender: resolvedGender,
      location: shippingOption === "Meet-up" ? trimmedLocation : undefined,
    };
  };

  // 🔥 保存为草稿（unlisted）
  const handleSaveDraft = async () => {
    if (!listing) return;
    const payload = validateAndBuildPayload();
    if (!payload) return;

    try {
      setSaving(true);
      console.log("📝 Saving as draft (unlisted):", listing.id);
      
      const updatedListing = await listingsService.updateListing(listing.id, {
        ...payload,
        listed: false, // 保持 unlisted 状态
      });
      
      console.log("✅ Draft saved successfully:", updatedListing.id);
      Alert.alert("Success", "Draft saved successfully!", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error("❌ Error saving draft:", error);
      Alert.alert("Error", "Failed to save draft. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // 🔥 发布商品（posted listing）
  const handlePostListing = async () => {
    if (!listing) return;
    const payload = validateAndBuildPayload();
    if (!payload) return;

    try {
      setSaving(true);
      console.log("📝 Posting listing (listed):", listing.id);
      
      const updatedListing = await listingsService.updateListing(listing.id, {
        ...payload,
        listed: true, // 设置为 listed
      });
      
      console.log("✅ Listing posted successfully:", updatedListing.id);
      Alert.alert("Success", "Listing posted successfully!", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error("❌ Error posting listing:", error);
      Alert.alert("Error", "Failed to post listing. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // 🔥 保存已发布商品的修改（保持 listed 状态）
  const handleSave = async () => {
    if (!listing) return;
    const payload = validateAndBuildPayload();
    if (!payload) return;

    try {
      setSaving(true);
      console.log("📝 Saving listing changes:", listing.id);
      
      const updatedListing = await listingsService.updateListing(listing.id, payload);
      console.log("✅ Listing updated successfully:", updatedListing.id);

      Alert.alert("Success", "Listing updated successfully!", [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error("❌ Error updating listing:", error);
      Alert.alert("Error", "Failed to update listing. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Picker visibility
  const [showCat, setShowCat] = useState(false);
  const [showCond, setShowCond] = useState(false);
  const [showSize, setShowSize] = useState(false);
  const [showMat, setShowMat] = useState(false);
  const [showShip, setShowShip] = useState(false);
  const [showGender, setShowGender] = useState(false);
  const [showBrand, setShowBrand] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);


  const ensureMediaPermissions = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        "Please enable photo library permissions in your device settings to select photos.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Settings",
            onPress: () => console.log("User should manually open Settings"),
          },
        ]
      );
      return false;
    }
    return true;
  };

  const ensureCameraPermissions = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        "Please enable camera permissions in your device settings to take photos.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Settings",
            onPress: () => console.log("User should manually open Settings"),
          },
        ]
      );
      return false;
    }
    return true;
  };

  const processSelectedAssets = async (assets: ImagePicker.ImagePickerAsset[]) => {
    if (!assets.length) return;

    const availableSlots = Math.max(PHOTO_LIMIT - photos.length, 0);
    if (availableSlots <= 0) {
      Alert.alert("Maximum Images", `You can only upload up to ${PHOTO_LIMIT} images.`);
      return;
    }

    const assetsToUse = assets.slice(0, availableSlots);
    if (assets.length > assetsToUse.length) {
      Alert.alert(
        "Too Many Images",
        `Only ${PHOTO_LIMIT} photos are allowed. ${assets.length - assetsToUse.length} image(s) were not added.`
      );
    }

    try {
      const prepared = await Promise.all(
        assetsToUse.map(async (asset) => {
          const manipulated = await ImageManipulator.manipulateAsync(
            asset.uri,
            [],
            { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
          );
          return manipulated.uri;
        })
      );

      setModerationChecking(true);
      const safe = await checkImagesSFW(prepared);
      setModerationChecking(false);

      if (!safe.allowAll) {
        const firstBad = safe.results.find((r) => !r.allow);
        const reason = firstBad?.reasons?.join(", ") || "policy";
        Alert.alert("Content Warning", `Some photos may be NSFW (${reason}). Please choose different photos.`);
        return;
      }

      for (const localUri of prepared) {
        const tempId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        setPhotos((prev) => [...prev, { id: tempId, localUri, uploading: true }]);
        try {
          const remoteUrl = await listingsService.uploadListingImage(localUri);
          setPhotos((prev) =>
            prev.map((photo) => (photo.id === tempId ? { ...photo, remoteUrl, uploading: false } : photo))
          );
        } catch (error) {
          console.error("Photo upload failed:", error);
          setPhotos((prev) => prev.filter((photo) => photo.id !== tempId));
          Alert.alert("Upload failed", "We couldn't upload that photo. Please try again.");
        }
      }
    } catch (error) {
      setModerationChecking(false);
      console.error("Selection pipeline failed:", error);
      Alert.alert("Error", "Failed to process photos. Please try again.");
    }
  };

  const handleDelete = (photoId: string) => {
    setPhotos((prev) => {
      const index = prev.findIndex((photo) => photo.id === photoId);
      const updated = prev.filter((photo) => photo.id !== photoId);
      if (index !== -1) {
        setPreviewIndex((prevIndex) => {
          if (prevIndex === null) return null;
          if (!updated.length) return null;
          if (prevIndex === index) {
            return Math.min(prevIndex, updated.length - 1);
          }
          if (prevIndex > index) {
            return prevIndex - 1;
          }
          return prevIndex;
        });
      }
      return updated;
    });
  };

  const handleSelectBrand = (selected: string) => {
    setBrand(selected);
  };

  const handleAddImage = async () => {
    if (photos.length >= PHOTO_LIMIT) {
      Alert.alert("Maximum Images", `You can only upload up to ${PHOTO_LIMIT} images.`);
      return;
    }
    const allowed = await ensureMediaPermissions();
    if (!allowed) return;

    const availableSlots = Math.max(PHOTO_LIMIT - photos.length, 1);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        allowsMultipleSelection: true,
        quality: 0.85,
        selectionLimit: availableSlots,
      });
      if (result.canceled || !result.assets?.length) return;
      await processSelectedAssets(result.assets);
    } catch (error: any) {
      console.error("Error adding images:", error?.message ?? String(error));
      Alert.alert("Error", "Failed to add images. Please try again.");
    }
  };

  const handleTakePhoto = async () => {
    if (photos.length >= PHOTO_LIMIT) {
      Alert.alert("Maximum Images", `You can only upload up to ${PHOTO_LIMIT} images.`);
      return;
    }
    const allowed = await ensureCameraPermissions();
    if (!allowed) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.length) return;
      await processSelectedAssets([result.assets[0]]);
    } catch (error: any) {
      console.error("Error taking photo:", error?.message ?? String(error));
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  };

  const showImageOptions = () => {
    if (photos.length >= PHOTO_LIMIT) {
      Alert.alert("Maximum Images", `You can only upload up to ${PHOTO_LIMIT} images.`);
      return;
    }
    Alert.alert("Add Photos", "Choose how you'd like to add photos", [
      { text: "Cancel", style: "cancel" },
      { text: "Photo Library", onPress: handleAddImage },
      { text: "Camera", onPress: handleTakePhoto },
    ]);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <Header title="Edit Listing" showBack />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <Header title="Edit Listing" showBack />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Listing not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* Header */}
      <Header title="Edit Listing" showBack />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Photos */}
          <FlatList
            data={photos}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <TouchableOpacity style={styles.photoItem} onPress={() => setPreviewIndex(index)}>
                <Image source={{ uri: item.localUri }} style={styles.photoImage} />
                {item.uploading ? (
                  <View style={styles.photoUploadingOverlay}>
                    <ActivityIndicator color="#fff" />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id);
                    }}
                  >
                    <Text style={styles.deleteText}>✕</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            )}
            ListFooterComponent={
              photos.length < PHOTO_LIMIT ? (
                <TouchableOpacity style={styles.addPhotoBox} onPress={showImageOptions}>
                  <Icon name="add" size={26} color="#999" />
                  <Text style={styles.addPhotoText}>Add Photo</Text>
                </TouchableOpacity>
              ) : null
            }
            style={{ marginBottom: 16 }}
          />
          {moderationChecking && (
            <View style={styles.moderationStatus}>
              <ActivityIndicator size="small" color="#111" />
              <Text style={styles.moderationText}>Checking photo safety…</Text>
            </View>
          )}

          {/* === 必填字段区域 === */}

          {/* Title - 必填 */}
          <Text style={styles.sectionTitle}>Title <Text style={styles.requiredMark}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter a catchy title for your item"
            maxLength={60}
            textAlignVertical="center"
          />
          <Text style={styles.charCount}>{title.length}/60</Text>

          {/* Description - 必填 */}
          <Text style={styles.sectionTitle}>Description <Text style={styles.requiredMark}>*</Text></Text>
          <TextInput
            style={[styles.input, { height: 100, textAlignVertical: "top" }]}
            multiline
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your item in detail..."
            maxLength={500}
          />
          <Text style={styles.charCount}>{description.length}/500</Text>

          {/* Category - 必填 */}
          <Text style={styles.sectionTitle}>Category <Text style={styles.requiredMark}>*</Text></Text>
          <TouchableOpacity style={styles.selectBtn} onPress={() => setShowCat(true)}>
            <Text style={styles.selectValue}>
              {category && category !== "Select" ? category : "Select"}
            </Text>
          </TouchableOpacity>

          {/* Price - 必填 */}
          <Text style={styles.sectionTitle}>Price <Text style={styles.requiredMark}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
            placeholder="Enter price (e.g. 25.00)"
            textAlignVertical="center"
          />

          {/* 🔥 Quantity / Stock - 必填 */}
          <Text style={styles.sectionTitle}>Stock Quantity <Text style={styles.requiredMark}>*</Text></Text>
          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            placeholder="Enter stock quantity (e.g. 1)"
            textAlignVertical="center"
          />
          <Text style={styles.helperText}>
            How many items are available for sale? (Minimum: 1)
          </Text>

          {/* Shipping - 必填 */}
          <Text style={styles.sectionTitle}>Shipping <Text style={styles.requiredMark}>*</Text></Text>
          <TouchableOpacity style={styles.selectBtn} onPress={() => setShowShip(true)}>
            <Text style={styles.selectValue}>
              {shippingOption && shippingOption !== "Select" ? shippingOption : "Select"}
            </Text>
          </TouchableOpacity>

          {shippingOption === "Buyer pays – fixed fee" && (
            <TextInput
              style={styles.input}
              placeholder="Enter custom fee (e.g. $3.00)"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={shippingFee}
              onChangeText={setShippingFee}
              textAlignVertical="center"
            />
          )}

          {shippingOption === "Meet-up" && (
            <>
              <Text style={styles.fieldLabel}>Meet-up Location</Text>
              <TextInput
                style={styles.input}
                placeholder="eg. Bugis MRT Station, Singapore"
                placeholderTextColor="#999"
                value={location}
                onChangeText={setLocation}
                textAlignVertical="center"
              />
            </>
          )}

          {/* Gender - 必选 */}
          <Text style={styles.sectionTitle}>
            Gender <Text style={styles.requiredMark}>*</Text>
          </Text>
          <TouchableOpacity style={styles.selectBtn} onPress={() => setShowGender(true)}>
            <Text style={styles.selectValue}>
              {gender && gender !== "Select" ? gender : "Select"}
            </Text>
          </TouchableOpacity>

          {/* === 可选字段区域 === */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Additional Details (Optional)</Text>

          <Text style={styles.fieldLabel}>Brand</Text>
          <TouchableOpacity style={styles.selectBtn} onPress={() => setShowBrand(true)}>
            <Text style={styles.selectValue}>
              {brand && brand !== "Select" ? brand : "Select"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>Condition</Text>
          <TouchableOpacity style={styles.selectBtn} onPress={() => setShowCond(true)}>
            <Text style={styles.selectValue}>
              {condition && condition !== "Select" ? condition : "Select"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>Size</Text>
          <TouchableOpacity style={styles.selectBtn} onPress={() => setShowSize(true)}>
            <Text style={styles.selectValue}>
              {size && size !== "Select" ? size : "Select"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>Material</Text>
          <TouchableOpacity style={styles.selectBtn} onPress={() => setShowMat(true)}>
            <Text style={styles.selectValue}>
              {material && material !== "Select" ? material : "Select"}
            </Text>
          </TouchableOpacity>

          {/* Tags Section */}
          <Text style={styles.fieldLabel}>Tags</Text>
          <Text style={{ color: "#555", marginBottom: 6, fontSize: 13 }}>
            Add up to 5 tags to help buyers find your item
          </Text>
          {tags.length === 0 ? (
            <TouchableOpacity style={styles.addStyleBtn} onPress={() => setShowTagPicker(true)}>
              <Icon name="add-circle-outline" size={18} color="#F54B3D" />
              <Text style={styles.addStyleText}>Style</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.selectedTagWrap}>
              {tags.map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{tag}</Text>
                  <TouchableOpacity
                    onPress={() => setTags(tags.filter((t) => t !== tag))}
                  >
                    <Icon name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
              {tags.length < 5 && (
                <TouchableOpacity
                  style={styles.addStyleBtnSmall}
                  onPress={() => setShowTagPicker(true)}
                >
                  <Icon name="add" size={16} color="#F54B3D" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Footer - 🔥 根据 listed 状态显示不同按钮 */}
          <View style={styles.footer}>
            {listing?.listed === false ? (
              <>
                {/* 草稿状态：Save to Draft + Post Listing */}
                <TouchableOpacity 
                  style={[styles.draftBtn, saving && styles.draftBtnDisabled]} 
                  onPress={handleSaveDraft}
                  disabled={saving}
                >
                  <Text style={styles.draftText}>
                    {saving ? "Saving..." : "Save to Draft"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.postBtn, saving && styles.postBtnDisabled]} 
                  onPress={handlePostListing}
                  disabled={saving}
                >
                  <Text style={styles.postText}>
                    {saving ? "Posting..." : "Post Listing"}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* 已发布状态：Cancel + Save Changes */}
                <TouchableOpacity style={styles.draftBtn} onPress={() => navigation.goBack()}>
                  <Text style={styles.draftText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.postBtn, saving && styles.postBtnDisabled]} 
                  onPress={handleSave}
                  disabled={saving}
                >
                  <Text style={styles.postText}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Image Preview Modal - 支持滑动切换 */}
      <Modal
        visible={previewIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewIndex(null)}
      >
        <View style={styles.previewModalOverlay}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: (previewIndex ?? 0) * Dimensions.get("window").width, y: 0 }}
            style={styles.previewScrollView}
          >
            {photos.map((photo) => (
              <View key={photo.id} style={styles.previewImageContainer}>
                <Image
                  source={{ uri: photo.localUri }}
                  style={styles.previewModalImage}
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>

          {/* 顶部工具栏 */}
          <View style={styles.previewTopBar}>
            <View style={styles.previewIndicator}>
              <Text style={styles.previewIndicatorText}>
                {(previewIndex ?? 0) + 1} / {photos.length}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.previewCloseBtn}
              onPress={() => setPreviewIndex(null)}
            >
              <Icon name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* 底部缩略图导航 */}
          {photos.length > 1 && (
            <View style={styles.previewBottomBar}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbnailContainer}
              >
                {photos.map((photo, index) => (
                  <TouchableOpacity
                    key={photo.id}
                    style={[
                      styles.thumbnail,
                      index === previewIndex && styles.thumbnailActive,
                    ]}
                    onPress={() => {
                      setPreviewIndex(index);
                      scrollViewRef.current?.scrollTo({
                        x: index * Dimensions.get("window").width,
                        animated: true,
                      });
                    }}
                  >
                    <Image
                      source={{ uri: photo.localUri }}
                      style={styles.thumbnailImage}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>

      {/* Pickers */}
      <OptionPicker
        title="Select category"
        visible={showCat}
        options={categoryOptions}
        value={category}
        onClose={() => setShowCat(false)}
        onSelect={setCategory}
      />
      <OptionPicker
        title="Select condition"
        visible={showCond}
        options={CONDITION_OPTIONS}
        value={condition}
        onClose={() => setShowCond(false)}
        onSelect={setCondition}
      />
      <OptionPicker
        title="Select size"
        visible={showSize}
        options={
          category === "Footwear"
            ? SIZE_OPTIONS_SHOES
            : category === "Accessories"
            ? SIZE_OPTIONS_ACCESSORIES
            : SIZE_OPTIONS_CLOTHES
        }
        value={size}
        onClose={() => setShowSize(false)}
        onSelect={setSize}
      />
      <OptionPicker
        title="Select material"
        visible={showMat}
        options={MATERIAL_OPTIONS}
        value={material}
        onClose={() => setShowMat(false)}
        onSelect={setMaterial}
      />
      <OptionPicker
        title="Select shipping option"
        visible={showShip}
        options={SHIPPING_OPTIONS}
        value={shippingOption}
        onClose={() => setShowShip(false)}
        onSelect={(value) => {
          setShippingOption(value);
          if (value !== "Buyer pays – fixed fee") {
            setShippingFee("");
          }
          if (value !== "Meet-up") {
            setLocation("");
          }
        }}
      />
      <OptionPicker
        title="Select gender"
        visible={showGender}
        options={GENDER_OPTIONS}
        value={gender}
        onClose={() => setShowGender(false)}
        onSelect={setGender}
      />
      <BrandPickerModal
        visible={showBrand}
        onClose={() => setShowBrand(false)}
        value={brand}
        onSelect={handleSelectBrand}
      />
      {/* Tag Picker Modal */}
      <TagPickerModal
        visible={showTagPicker}
        onClose={() => setShowTagPicker(false)}
        tags={tags}
        setTags={setTags}
      />
    </View>
  );
}

function BrandPickerModal({
  visible,
  onClose,
  value,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  value: string;
  onSelect: (value: string) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = BRAND_OPTIONS.filter((brand) =>
    brand.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal transparent visible={visible} animationType="slide">
      <Pressable style={styles.sheetMask} onPress={onClose} />
      <View style={styles.brandSheet}>
        <View style={styles.brandSheetHeader}>
          <Text style={styles.brandSheetTitle}>Select brand</Text>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={24} color="#111" />
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.brandSearch}
          placeholder="Search brands..."
          value={search}
          onChangeText={setSearch}
          textAlignVertical="center"
        />

        <ScrollView style={{ height: 500 }}>
          {filtered.map((brand) => {
            const selected = value === brand;
            return (
              <TouchableOpacity
                key={brand}
                style={[styles.brandOption, selected && styles.brandOptionSelected]}
                onPress={() => {
                  onSelect(brand);
                  onClose();
                }}
              >
                <Text style={[styles.brandOptionText, selected && { color: "#fff" }]}>
                  {brand}
                </Text>
                {selected && <Text style={{ color: "#fff", fontSize: 18 }}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity style={styles.sheetCancel} onPress={onClose}>
          <Text style={{ fontWeight: "600" }}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function TagPickerModal({
  visible,
  onClose,
  tags,
  setTags,
}: {
  visible: boolean;
  onClose: () => void;
  tags: string[];
  setTags: (tags: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [customTag, setCustomTag] = useState("");

  const filtered = DEFAULT_TAGS.filter((t) =>
    t.toLowerCase().includes(search.toLowerCase())
  );

  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag) && tags.length < 5) {
      setTags([...tags, tag]);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="slide">
      <Pressable style={styles.sheetMask} onPress={onClose} />
      <View style={styles.tagSheet}>
        {/* Header */}
        <View style={styles.tagSheetHeader}>
          <Text style={styles.tagSheetTitle}>Select tags</Text>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={24} color="#111" />
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <TextInput
          style={styles.tagSearch}
          placeholder="Search tags..."
          value={search}
          onChangeText={setSearch}
          textAlignVertical="center"
        />

        {/* Tag grid */}
        <ScrollView style={{ maxHeight: 360 }}>
          <View style={styles.tagGrid}>
            {filtered.map((t) => {
              const selected = tags.includes(t);
              return (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.tagOption,
                    selected && styles.tagOptionSelected,
                  ]}
                  onPress={() =>
                    selected
                      ? setTags(tags.filter((x) => x !== t))
                      : addTag(t)
                  }
                >
                  <Text
                    style={[
                      styles.tagOptionText,
                      selected && { color: "#fff" },
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Custom Tag */}
        <View style={styles.customTagRow}>
          <TextInput
            style={styles.customTagInput}
            placeholder="Other..."
            value={customTag}
            onChangeText={setCustomTag}
          textAlignVertical="center"
          />
          <TouchableOpacity
            style={styles.customTagAddBtn}
            onPress={() => {
              addTag(customTag.trim());
              setCustomTag("");
            }}
          >
            <Text style={styles.customTagAddText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Done */}
        <TouchableOpacity style={styles.sheetDone} onPress={onClose}>
          <Text style={{ fontWeight: "600" }}>Done</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },

  /** --- photo --- */
  photoItem: {
    width: 90,
    height: 90,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 10,
    position: "relative",
  },
  photoImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  photoUploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(255,0,0,0.85)",
    borderRadius: 12,
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteText: { color: "#fff", fontSize: 13, fontWeight: "700", lineHeight: 16 },
  addPhotoBox: {
    width: 90,
    height: 90,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fafafa",
  },
  addPhotoText: {
    fontSize: 10,
    color: "#999",
    marginTop: 4,
    textAlign: "center",
  },
  moderationStatus: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  moderationText: {
    fontSize: 13,
    color: "#555",
    marginLeft: 8,
  },

  sectionTitle: { fontSize: 16, fontWeight: "600", marginTop: 12, marginBottom: 8 },
  requiredMark: { color: "#F54B3D", fontWeight: "700" },
  fieldLabel: { fontSize: 14, fontWeight: "500", color: "#333", marginBottom: 6, marginTop: 8 },
  charCount: { 
    fontSize: 12, 
    color: "#999", 
    textAlign: "right", 
    marginTop: -8, 
    marginBottom: 8 
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "android" ? 0 : 10,
    minHeight: 46,
    marginBottom: 12,
    fontSize: 15,
    backgroundColor: "#fafafa",
    includeFontPadding: false,
  },
  helperText: { 
    fontSize: 12, 
    color: "#666", 
    marginTop: -8, 
    marginBottom: 12 
  }, // 🔥 Helper text style
  selectBtn: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    width: "100%",
  },
  selectValue: { fontSize: 15, color: "#111" },
  footer: { flexDirection: "row", justifyContent: "space-between", marginTop: 20 },
  draftBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: "center",
    marginRight: 8,
  },
  draftBtnDisabled: {
    borderColor: "#999",
    opacity: 0.6,
  },
  draftText: { fontWeight: "600", fontSize: 16 },
  postBtn: {
    flex: 1,
    backgroundColor: "#000",
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: "center",
    marginLeft: 8,
  },
  postBtnDisabled: {
    backgroundColor: "#666",
  },
  postText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  sheetMask: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#DDD",
    marginBottom: 8,
  },
  sheetTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  optionRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 10,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  optionText: { fontSize: 15, color: "#111" },
  sheetCancel: {
    marginTop: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F6F6F6",
    alignItems: "center",
  },

  // Tags
  addStyleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F54B3D",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
  },
  addStyleText: {
    color: "#F54B3D",
    fontWeight: "600",
    marginLeft: 6,
  },
  selectedTagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagChip: {
    backgroundColor: "#F54B3D",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tagChipText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  addStyleBtnSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#F54B3D",
    alignItems: "center",
    justifyContent: "center",
  },

  // Tag Picker Modal
  tagSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  tagSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  tagSheetTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  tagSearch: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "android" ? 0 : 10,
    fontSize: 15,
    backgroundColor: "#fafafa",
    marginBottom: 10,
    minHeight: 46,
    includeFontPadding: false,
  },
  tagGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagOption: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagOptionSelected: {
    backgroundColor: "#111",
    borderColor: "#111",
  },
  tagOptionText: {
    fontSize: 14,
    color: "#111",
  },
  customTagRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
  },
  customTagInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "android" ? 0 : 8,
    fontSize: 15,
    minHeight: 46,
    includeFontPadding: false,
  },
  customTagAddBtn: {
    backgroundColor: "#F54B3D",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  customTagAddText: {
    color: "#fff",
    fontWeight: "600",
  },
  sheetDone: {
    marginTop: 10,
    backgroundColor: "#F6F6F6",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },

  // Image Preview Modal
  previewModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
  },
  previewScrollView: {
    flex: 1,
  },
  previewImageContainer: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
    justifyContent: "center",
    alignItems: "center",
  },
  previewModalImage: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height * 0.8,
  },
  previewTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  previewIndicator: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  previewIndicatorText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  previewCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewBottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  thumbnailContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  thumbnail: {
    width: 60,
    height: 75,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  thumbnailActive: {
    borderColor: "#fff",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  brandSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: "80%",
  },
  brandSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  brandSheetTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  brandSearch: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "android" ? 0 : 10,
    fontSize: 15,
    backgroundColor: "#fafafa",
    marginBottom: 12,
    minHeight: 46,
    includeFontPadding: false,
  },
  brandOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 10,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandOptionSelected: {
    backgroundColor: "#5B21B6",
    borderColor: "#5B21B6",
  },
  brandOptionText: {
    fontSize: 15,
    color: "#111",
  },
  // clearTiny removed (legacy back link)
});
