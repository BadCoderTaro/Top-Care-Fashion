import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView as RNScrollView,
  Alert,
  type AlertButton,
  Image,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import type { TextInput as RNTextInput } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import Icon from "../../../components/Icon";
import Header from "../../../components/Header";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect, useRoute, CommonActions } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { SellStackParamList } from "./SellStackNavigator";
import {
  listingsService,
  type CreateListingRequest,
  type DraftListingRequest,
} from "../../../src/services/listingsService";
import { useAuth } from "../../../contexts/AuthContext";
import { useAutoClassify } from "../../../src/hooks/useAutoClassify";
import { ClassifyResponse, checkImagesSFW, describeProduct } from "../../../src/services/aiService";
import type { ListingItem } from "../../../types/shop";
import { sortCategories } from "../../../utils/categoryHelpers";
import { onSellFormReset } from "../../../src/events/sellFormEvents";

/** --- Options (categories loaded dynamically from database) --- */
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
const GENDER_OPTIONS = ["Men", "Women", "Unisex"];
const SIZE_OPTIONS_CLOTHES = ["XXS","XS","S","M","L","XL","XXL","XXXL","Free Size","Other"];
const SIZE_OPTIONS_SHOES = ["35","36","37","38","39","40","41","42","43","44","45","Other"];
const SIZE_OPTIONS_ACCESSORIES = ["One Size","Small","Medium","Large"];
const MATERIAL_OPTIONS = [
  "Cotton","Polyester","Denim","Leather","Faux Leather","Wool","Silk","Linen",
  "Nylon","Spandex / Elastane","Canvas","Suede","Velvet","Acrylic","Cashmere",
  "Rayon / Viscose","Other",
];
const SHIPPING_OPTIONS = [
  "Free shipping",
  "Buyer pays – $5 (island-wide)",
  "Buyer pays – fixed fee",
  "Meet-up",
];
const DEFAULT_TAGS = [
  "Vintage","Y2K","Streetwear","Preloved","Minimal","Sporty","Elegant","Retro",
  "Casual","Outdoor","Grunge","Coquette","Cottagecore","Punk","Cyberpunk",
];
const PHOTO_LIMIT = 9;

/** --- Bottom Sheet Picker --- */
type OptionPickerProps = {
  title: string;
  visible: boolean;
  options: string[];
  value: string;
  onClose: () => void;
  onSelect: (value: string) => void;
};

type PhotoItem = {
  id: string;
  localUri: string;
  remoteUrl?: string;
  uploading: boolean;
  error?: string;
};

function OptionPicker({
  title,
  visible,
  options,
  value,
  onClose,
  onSelect,
}: OptionPickerProps) {
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
              style={[styles.optionRow, value === opt && { backgroundColor: "#F3E8FF", borderColor: "#5B21B6" }]}
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

type SellScreenNavigationProp = NativeStackNavigationProp<SellStackParamList, "SellMain">;

/** --- 5-category mapping: canonical → UI with keyword fallback --- */
type CategoryKeywordHint = { regex: RegExp; tokens: string[] };

const CATEGORY_KEYWORD_HINTS: CategoryKeywordHint[] = [
  { regex: /(shirt|t-?shirt|tee|blouse|hoodie|sweater|cardigan|pullover|tank|polo|jersey|crewneck|top)/i, tokens: ["top", "shirt", "tee", "hoodie", "sweater"] },
  { regex: /(jeans|pants|trousers|shorts|skirt|legging|denim|culotte)/i, tokens: ["bottom", "pant", "jean", "short", "skirt", "legging"] },
  { regex: /(shoe|sneaker|boot|heel|sandal|loafer|oxford|slipper|trainer)/i, tokens: ["shoe", "footwear", "sneaker", "boot", "heel"] },
  { regex: /(jacket|coat|blazer|trench|windbreaker|parka|raincoat|puffer|vest)/i, tokens: ["outerwear", "jacket", "coat", "blazer", "vest"] },
  { regex: /(dress|gown|romper|jumpsuit)/i, tokens: ["dress", "gown", "romper", "jumpsuit"] },
  { regex: /(bag|handbag|purse|tote|backpack|clutch|crossbody|satchel|duffel|briefcase|fanny)/i, tokens: ["bag"] },
  { regex: /(watch|hat|cap|beanie|belt|scarf|sunglasses|glasses|tie|earring|necklace|ring|bracelet|jewelry|umbrella|hairband)/i, tokens: ["accessor", "jewelry", "hat", "belt", "scarf"] },
];

const normalizeCategoryValue = (value: string) => value.trim().toLowerCase();

export default function SellScreen({
  navigation,
}: {
  navigation: NativeStackNavigationProp<SellStackParamList, "SellMain">;
}) {
  const route = useRoute<RouteProp<SellStackParamList, "SellMain">>();
  const { user } = useAuth();
  const [editingDraftId, setEditingDraftId] = useState<string | null>(route.params?.draftId ?? null);
  const [loadedDraft, setLoadedDraft] = useState<ListingItem | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const [initializingDraft, setInitializingDraft] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiDesc, setAiDesc] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Dynamic categories loaded from database
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Gender
  const [gender, setGender] = useState("Select");

  // Info
  const [category, setCategory] = useState<string>("Select"); // UI category (plural)
  const [userPickedCategory, setUserPickedCategory] = useState(false); // prevents AI overwriting manual choice
  const [condition, setCondition] = useState("Select");
  const [size, setSize] = useState("Select");

  // Image preview
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const scrollViewRef = useRef<RNScrollView>(null);
  const [customSize, setCustomSize] = useState("");
  const [material, setMaterial] = useState("Select");
  const [customMaterial, setCustomMaterial] = useState("");
  const [brand, setBrand] = useState("Select");
  const [brandCustom, setBrandCustom] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1"); // 🔥 库存数量，默认为1
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const customSizeInputRef = useRef<RNTextInput | null>(null);
  const customMaterialInputRef = useRef<RNTextInput | null>(null);
  const brandCustomInputRef = useRef<RNTextInput | null>(null);
  const shouldFocusSizeInput = useRef(false);
  const shouldFocusMaterialInput = useRef(false);
  const shouldFocusBrandInput = useRef(false);

  const resolveCategoryFromOptions = useCallback(
    (raw?: string | null): string | null => {
      if (!raw || !categoryOptions.length) {
        return null;
      }
      const normalizedRaw = normalizeCategoryValue(raw);
      if (!normalizedRaw) {
        return null;
      }

      const exact = categoryOptions.find(
        option => normalizeCategoryValue(option) === normalizedRaw
      );
      if (exact) {
        return exact;
      }

      const partial = categoryOptions.find(option => {
        const normalizedOption = normalizeCategoryValue(option);
        return (
          normalizedOption.includes(normalizedRaw) || normalizedRaw.includes(normalizedOption)
        );
      });
      if (partial) {
        return partial;
      }

      for (const hint of CATEGORY_KEYWORD_HINTS) {
        if (hint.regex.test(raw)) {
          const candidate = categoryOptions.find(option => {
            const normalizedOption = normalizeCategoryValue(option);
            return hint.tokens.some(token => normalizedOption.includes(token));
          });
          if (candidate) {
            return candidate;
          }
        }
      }

      return null;
    },
    [categoryOptions]
  );

  // Load categories from database
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoriesLoading(true);
        const data = await listingsService.getCategories();
        
        // ✅ 直接使用 categoryMap，包含所有预定义的 active 分类
        // categoryMap 是后端从 listing_categories 表直接读取的，不依赖是否有商品
        const allCategoryNames = data.categoryMap 
          ? Object.keys(data.categoryMap)
          : [];
        
        const sorted = sortCategories(allCategoryNames);
        setCategoryOptions(sorted);
      } catch (error) {
        console.error("Failed to load categories:", error);
        // Fallback to empty array - user will need to manually select
        setCategoryOptions([]);
      } finally {
        setCategoriesLoading(false);
      }
    };
    loadCategories();
  }, []);

  // ✅ Benefits 由 ConfirmSellScreen 处理，不需要在这里加载

  // Shipping
  const [shippingOption, setShippingOption] = useState("Select");
  const [shippingFee, setShippingFee] = useState("");
  const [location, setLocation] = useState("");

  // Pickers
  const [showGender, setShowGender] = useState(false);
  const [showCat, setShowCat] = useState(false);
  const [showCond, setShowCond] = useState(false);
  const [showSize, setShowSize] = useState(false);
  const [showMaterial, setShowMaterial] = useState(false);
  const [showBrand, setShowBrand] = useState(false);
  const [showShip, setShowShip] = useState(false);

  // Tags
  const [tags, setTags] = useState<string[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const [moderationChecking, setModerationChecking] = useState(false);
  const isEditingDraft = Boolean(editingDraftId);

  // Reset all input states back to initial values
  const resetForm = useCallback(() => {
    setTitle("");
    setDescription("");
    setAiDesc(null);
    setGender("Select");
    setCategory("Select");
    setUserPickedCategory(false);
    setCondition("Select");
    setSize("Select");
    setMaterial("Select");
    setBrand("Select");
    setPrice("");
    setQuantity("1"); // 🔥 重置库存数量
    setPhotos([]);
    setPreviewIndex(null);
    setShippingOption("Select");
    setShippingFee("");
    setLocation("");
    setTags([]);
    setShowGender(false);
    setShowCat(false);
    setShowCond(false);
    setShowSize(false);
    setShowMaterial(false);
    setShowBrand(false);
    setShowShip(false);
    setShowTagPicker(false);
    setShowGuide(false);
    setModerationChecking(false);
    setSaving(false);
    setSavingDraft(false);
    setEditingDraftId(null);
    setLoadedDraft(null);
    setInitializingDraft(false);
  }, []);

  useEffect(() => {
    return onSellFormReset(() => {
      if (route.params?.draftId !== undefined) {
        navigation.setParams({ draftId: undefined });
      }
      resetForm();
    });
  }, [navigation, resetForm, route.params?.draftId]);


  const hydrateDraftFromListing = useCallback((listing: ListingItem) => {
    setTitle(listing.title ?? "");
    setDescription(listing.description ?? "");
    setAiDesc(null);

    const normalizedGender = listing.gender ? listing.gender.toLowerCase() : "";
    const mappedGender =
      GENDER_OPTIONS.find((opt) => opt.toLowerCase() === normalizedGender) ?? "Select";
    setGender(mappedGender);

    let resolvedCategory: string = "Select";
    if (listing.category) {
      const matched = resolveCategoryFromOptions(listing.category);
      if (matched) {
        resolvedCategory = matched;
      }
    }
    setCategory(resolvedCategory);
    setUserPickedCategory(resolvedCategory !== "Select");

    const normalizedCondition = listing.condition ?? "Select";
    setCondition(
      CONDITION_OPTIONS.includes(normalizedCondition) ? normalizedCondition : "Select"
    );

    const allSizeOptions = [
      ...SIZE_OPTIONS_CLOTHES,
      ...SIZE_OPTIONS_SHOES,
      ...SIZE_OPTIONS_ACCESSORIES,
    ];
    if (listing.size && allSizeOptions.includes(listing.size)) {
      setSize(listing.size);
    } else if (listing.size) {
      setSize("Other");
    } else {
      setSize("Select");
    }

    if (listing.material && MATERIAL_OPTIONS.includes(listing.material)) {
      setMaterial(listing.material);
    } else if (listing.material) {
      setMaterial("Other");
    } else {
      setMaterial("Select");
    }

    if (listing.brand && BRAND_OPTIONS.includes(listing.brand)) {
      setBrand(listing.brand);
    } else if (listing.brand) {
      setBrand("Other");
    } else {
      setBrand("Select");
    }

    setPrice(listing.price != null ? String(listing.price) : "");
    setQuantity(listing.quantity != null ? String(listing.quantity) : "1"); // 🔥 加载库存数量
    setTags(listing.tags ?? []);

    const remoteImages = Array.isArray(listing.images)
      ? listing.images.filter((uri) => typeof uri === "string" && uri.trim().length > 0)
      : [];
    setPhotos(
      remoteImages.map((uri, index) => ({
        id: `${listing.id}-${index}`,
        localUri: uri,
        remoteUrl: uri,
        uploading: false,
      }))
    );
    setPreviewIndex(null);

    const shippingOptionValue = listing.shippingOption ?? "Select";
    setShippingOption(shippingOptionValue);
    if (listing.shippingFee != null && !Number.isNaN(Number(listing.shippingFee))) {
      setShippingFee(String(Number(listing.shippingFee)));
    } else {
      setShippingFee("");
    }
    if (shippingOptionValue === "Meet-up") {
      setLocation(listing.location ?? "");
    } else {
      setLocation("");
    }

    setSavingDraft(false);
    setSaving(false);
  }, [resolveCategoryFromOptions]);

  useEffect(() => {
    const incomingId = route.params?.draftId ?? null;

    if (!incomingId) {
      if (editingDraftId !== null) {
        // 从编辑草稿返回到新建状态，清空所有表单
        resetForm();
      }
      return;
    }

    if (incomingId === editingDraftId && loadedDraft) {
      return;
    }

    let cancelled = false;

    const loadDraft = async () => {
      try {
        setInitializingDraft(true);
        const listing = await listingsService.getListingById(incomingId);
        if (cancelled) return;
        if (listing) {
          hydrateDraftFromListing(listing);
          setLoadedDraft(listing);
          setEditingDraftId(listing.id);
        } else {
          throw new Error("Draft not found");
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to load draft:", error);
        Alert.alert(
          "Draft unavailable",
          "We couldn't load that draft. It may have been removed.",
          [
            {
              text: "OK",
              onPress: () => {
                navigation.setParams({});
              },
            },
          ]
        );
        setEditingDraftId(null);
        setLoadedDraft(null);
      } finally {
        if (!cancelled) {
          setInitializingDraft(false);
        }
      }
    };

    loadDraft();

    return () => {
      cancelled = true;
    };
  }, [route.params?.draftId, editingDraftId, loadedDraft, hydrateDraftFromListing, navigation, resetForm]);

  /** ---------- 🧠 AI hook integration ---------- */
  const aiUris = React.useMemo(() => photos.map(p => p.localUri), [photos]);
  const {
    items: aiItems,
    running: aiRunning,
    start: aiStart,
    cancel: aiCancel,
    progress: aiProgress,
    requeueAll,
    requeueOne: aiRequeueOne,
  } = useAutoClassify(aiUris, { autoDescribe: true, concurrency: 1 });

  // StrictMode-safe: start once per unique batch of URIs
  const aiStartKeyRef = React.useRef<string>("");
  useEffect(() => {
    const key = aiUris.join("|"); // '' if no photos
    if (!key) {
      aiStartKeyRef.current = "";
      return;
    }
    if (aiStartKeyRef.current === key) {
      return;
    }
    if (aiItems.length !== aiUris.length) {
      return;
    }
    const allPending = aiItems.every(item => item.status === "pending");
    if (!allPending) {
      return;
    }
    aiStartKeyRef.current = key;
    const timer = setTimeout(() => {
      aiStart();
    }, 0);
    return () => clearTimeout(timer);
  }, [aiUris, aiItems, aiStart]);

  // Helper to grab AI result for a specific photo
  const findAI = React.useCallback(
    (uri: string) => aiItems.find(i => i.uri === uri),
    [aiItems]
  );

  // 🔁 Auto-update Category from best AI (unless user has chosen manually)
  useEffect(() => {
    if (userPickedCategory) return;
    const candidates = aiItems
      .map(i => i.classification)
      .filter((c): c is ClassifyResponse => !!c?.category);

    if (!candidates.length) return;
    const best = candidates.reduce((a, b) => ((b.confidence ?? 0) > (a.confidence ?? 0) ? b : a));
    const mapped = resolveCategoryFromOptions(best.category);
    if (mapped && mapped !== category) {
      setCategory(mapped);
    }
  }, [aiItems, userPickedCategory, category, resolveCategoryFromOptions]);

  // Permissions
  const ensureMediaPermissions = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Please allow photo library access to upload images.");
      return false;
    }
    return true;
  };

  const ensureCameraPermissions = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Please allow camera access to take photos.");
      return false;
    }
    return true;
  };

  /** Selection pipeline with SFW moderation (one gate for all chosen images) */
  const processSelectedAssets = async (assets: ImagePicker.ImagePickerAsset[]) => {
    if (!assets.length) return;

    const availableSlots = Math.max(PHOTO_LIMIT - photos.length, 0);
    if (availableSlots <= 0) {
      Alert.alert("Limit reached", `You can upload up to ${PHOTO_LIMIT} photos per listing.`);
      return;
    }

    const assetsToUse = assets.slice(0, availableSlots);
    if (assets.length > assetsToUse.length) {
      Alert.alert(
        "Limit reached",
        `Only ${PHOTO_LIMIT} photos are allowed. ${assets.length - assetsToUse.length} image(s) were not added.`
      );
    }

    try {
      // 1) Convert all to JPEG & collect URIs
      const prepared = await Promise.all(
        assetsToUse.map(async (asset) => {
          const img = await ImageManipulator.manipulateAsync(
            asset.uri,
            [],
            { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
          );
          return img.uri;
        })
      );

      // 2) Run SafeSearch pre-upload moderation once for the batch
      setModerationChecking(true);
      const safe = await checkImagesSFW(prepared);
      setModerationChecking(false);

      if (!safe.allowAll) {
        const firstBad = safe.results.find(r => !r.allow);
        const reason = firstBad?.reasons?.join(", ") || "policy";
        Alert.alert("Content Warning", `Some photos may be NSFW (${reason}). Please choose different photos.`);
        return; // 🚫 stop here
      }

      // 3) SFW → add to UI and upload to storage
      for (const localUri of prepared) {
        const tempId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        setPhotos((prev) => [...prev, { id: tempId, localUri, uploading: true }]);
        try {
          const remoteUrl = await listingsService.uploadListingImage(localUri);
          setPhotos((prev) =>
            prev.map((p) => (p.id === tempId ? { ...p, remoteUrl, uploading: false } : p))
          );
        } catch (error) {
          console.error("Photo upload failed:", error);
          setPhotos((prev) => prev.filter((p) => p.id !== tempId));
          Alert.alert("Upload failed", "We couldn't upload that photo. Please try again.");
        }
      }
    } catch (error) {
      setModerationChecking(false);
      console.error("Selection pipeline failed:", error);
      Alert.alert("Error", "We couldn't process those photos. Please try again.");
    }
  };

  const handlePickFromLibrary = async () => {
    if (photos.length >= PHOTO_LIMIT) {
      Alert.alert("Limit reached", `You can upload up to ${PHOTO_LIMIT} photos per listing.`);
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
      console.log("Image picker error:", error?.message ?? String(error));
    }
  };

  const handleCapturePhoto = async () => {
    if (photos.length >= PHOTO_LIMIT) {
      Alert.alert("Limit reached", `You can upload up to ${PHOTO_LIMIT} photos per listing.`);
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
      console.log("Camera error:", error?.message ?? String(error));
    }
  };

  const handleAddPhoto = () => {
    if (photos.length >= PHOTO_LIMIT) {
      Alert.alert("Limit reached", `You can upload up to ${PHOTO_LIMIT} photos per listing.`);
      return;
    }
    Alert.alert("Add Photos", "Choose how you'd like to add photos", [
      { text: "Cancel", style: "cancel" },
      { text: "Photo Library", onPress: handlePickFromLibrary },
      { text: "Camera", onPress: handleCapturePhoto },
    ]);
  };

  const handleRemovePhoto = (photoId: string) => {
    setPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
  };

  const handleSelectBrand = (selected: string) => {
    setBrand(selected);
  };

  const generateDescription = async () => {
    // Prefer explicit user choice; otherwise use best AI mapped to DB-driven categories
    const aiCategory = aiItems[0]?.classification?.category;
    const resolvedCategory =
      category !== "Select"
        ? category
        : resolveCategoryFromOptions(aiCategory) ?? categoryOptions[0] ?? "General";

    const describeCategory =
      resolvedCategory === "Select" ? categoryOptions[0] ?? "General" : resolvedCategory;

    setLoading(true);
    setAiDesc(null);

    try {
      const labels = aiItems.flatMap(i => i.classification?.labels ?? []).slice(0, 10);

      const data = await describeProduct(
        describeCategory,
        labels.length ? labels : ["fashion", "clothing"]
      );
      setAiDesc(data.blurb || "No description returned");
    } catch (err) {
      console.error("AI describer failed:", err);
      Alert.alert("AI Error", "Could not generate description. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReclassifyAll = () => {
    if (!photos.length) return;
    requeueAll();
    setTimeout(() => aiStart(), 0);
  };

  const handleSaveDraft = async () => {
    if (savingDraft || initializingDraft) {
      return;
    }

    if (photos.some((photo) => photo.uploading)) {
      Alert.alert("Uploading", "Please wait for all photos to finish uploading before saving.");
      return;
    }

    const hasPendingImage = photos.some((photo) => !photo.remoteUrl);
    if (hasPendingImage) {
      Alert.alert("Processing images", "Images are still processing. Please try again in a moment.");
      return;
    }

    const payload: DraftListingRequest = {};

    const trimmedTitle = title.trim();
    payload.title = trimmedTitle;

    payload.description = description.trim();

    if (price.trim()) {
      const numericPrice = Number(price.trim());
      if (!Number.isNaN(numericPrice)) {
        payload.price = numericPrice;
      }
    }

    // 🔥 保存库存数量
    if (quantity.trim()) {
      const numericQuantity = Number(quantity.trim());
      if (!Number.isNaN(numericQuantity) && numericQuantity >= 1) {
        payload.quantity = numericQuantity;
      }
    }

    if (brand !== "Select") {
      payload.brand = brand;
    } else {
      payload.brand = "";
    }

    const resolvedSize = size !== "Select" ? size : null;
    payload.size = resolvedSize;

    if (condition !== "Select") {
      payload.condition = condition;
    }

    const resolvedMaterial = material !== "Select" ? material : null;
    payload.material = resolvedMaterial;

    payload.tags = tags;

    payload.category = category !== "Select" ? category : null;

    payload.gender = gender !== "Select" ? gender.toLowerCase() : null;

    const remoteImages = photos
      .map((photo) => photo.remoteUrl)
      .filter((uri): uri is string => typeof uri === "string" && uri.trim().length > 0);
    payload.images = remoteImages;

    if (shippingOption !== "Select") {
      payload.shippingOption = shippingOption;
      let derivedFee: number | null = null;
      try {
        if (shippingOption.includes("$3")) {
          derivedFee = 3;
        } else if (shippingOption.includes("$5")) {
          derivedFee = 5;
        } else if (shippingOption === "Free shipping" || shippingOption === "Meet-up") {
          derivedFee = 0;
        } else if (shippingOption === "Buyer pays – fixed fee") {
          const customFee = Number(shippingFee.trim());
          if (!Number.isNaN(customFee)) {
            derivedFee = customFee;
          }
        }
      } catch (error) {
        console.warn("Failed to derive shipping fee for draft", error);
      }

      if (derivedFee !== null) {
        payload.shippingFee = derivedFee;
      } else if (shippingFee.trim()) {
        const fallbackFee = Number(shippingFee.trim());
        if (!Number.isNaN(fallbackFee)) {
          payload.shippingFee = fallbackFee;
        }
      }
    } else {
      payload.shippingOption = null;
      payload.shippingFee = undefined;
    }

    if (shippingOption === "Meet-up") {
      payload.location = location.trim();
    } else if (location.trim()) {
      payload.location = location.trim();
    } else {
      payload.location = null;
    }

    try {
      setSavingDraft(true);
      let result: ListingItem;
      if (editingDraftId) {
        result = await listingsService.updateDraft(editingDraftId, payload);
        setLoadedDraft(result);
        hydrateDraftFromListing(result);
        // 编辑模式下保存后直接返回草稿箱，不弹窗
        navigation.goBack();
      } else {
        result = await listingsService.createDraft(payload);
        setEditingDraftId(result.id);
        setLoadedDraft(result);
        hydrateDraftFromListing(result);
        navigation.setParams({ draftId: result.id });
        Alert.alert("Draft saved", "We saved this listing to your drafts.", [
          { text: "Keep editing", style: "cancel" },
          {
            text: "View drafts",
            onPress: () => navigation.navigate("Drafts"),
          },
        ]);
      }
    } catch (error) {
      console.error("Error saving draft:", error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Failed to save draft. Please try again.";
      Alert.alert("Error", message);
    } finally {
      setSavingDraft(false);
    }
  };

  // 保存 listing
  // ✅ 限制检查由 ConfirmSellScreen 处理，这里只做表单验证和导航
  const handlePostListing = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert("Missing Information", "Please add a title");
      return;
    }

    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      Alert.alert("Missing Information", "Please add a description");
      return;
    }

    if (category === "Select") {
      Alert.alert("Missing Information", "Please select a category");
      return;
    }

    if (condition === "Select") {
      Alert.alert("Missing Information", "Please select a condition");
      return;
    }

    const priceInput = price.trim();
    if (!priceInput) {
      Alert.alert("Missing Information", "Please enter a price");
      return;
    }

    const priceValue = parseFloat(priceInput);
    if (Number.isNaN(priceValue) || priceValue <= 0) {
      Alert.alert("Invalid Price", "Please enter a valid price");
      return;
    }

    if (shippingOption === "Select") {
      Alert.alert("Missing Information", "Please select a shipping option");
      return;
    }

    if (gender === "Select") {
      Alert.alert("Missing Information", "Please select a gender");
      return;
    }

    const shippingFeeInput = shippingFee.trim();
    let resolvedShippingFee: number | undefined;
    if (shippingOption === "Buyer pays – fixed fee") {
      if (!shippingFeeInput) {
        Alert.alert("Missing Information", "Please enter a shipping fee");
        return;
      }
      const parsedFee = parseFloat(shippingFeeInput);
      if (Number.isNaN(parsedFee) || parsedFee < 0) {
        Alert.alert("Invalid Shipping Fee", "Please enter a valid shipping fee");
        return;
      }
      resolvedShippingFee = parsedFee;
    } else if (shippingFeeInput) {
      const parsedFee = parseFloat(shippingFeeInput);
      if (!Number.isNaN(parsedFee)) {
        resolvedShippingFee = parsedFee;
      }
    }

    const trimmedLocation = location.trim();
    if (shippingOption === "Meet-up" && !trimmedLocation) {
      Alert.alert("Missing Information", "Please enter a meet-up location");
      return;
    }

    if (photos.some((photo) => photo.uploading)) {
      Alert.alert("Uploading", "Please wait for all photos to finish uploading before posting.");
      return;
    }

    const uploadedImages = photos
      .filter((photo) => !!photo.remoteUrl)
      .map((photo) => photo.remoteUrl!)
      .slice(0, PHOTO_LIMIT);

    const resolvedSize = size !== "Select" ? size : null;
    const resolvedMaterial = material !== "Select" ? material : "Polyester";
    const resolvedBrand = brand !== "Select" ? brand : "";
    const resolvedGender = gender !== "Select" ? gender.toLowerCase() : "unisex";

    setSaving(true);
    try {
      // derive a numeric shipping fee for preset options (prefer preset over user-entered resolved value)
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

      // 🔥 解析并验证库存数量
      const quantityValue = parseInt(quantity || "1", 10);
      if (isNaN(quantityValue) || quantityValue < 1) {
        Alert.alert("Invalid quantity", "Stock quantity must be at least 1.");
        setSaving(false);
        return;
      }

      const listingData: CreateListingRequest = {
        title: trimmedTitle,
        description: trimmedDescription,
        price: priceValue,
        brand: resolvedBrand,
        size: resolvedSize,
        condition: condition !== "Select" ? condition : "Good",
        material: resolvedMaterial,
        tags,
        category, // UI category (plural) is fine to store/display
        gender: resolvedGender,
        images: uploadedImages,
        shippingOption,
        // prefer calculated preset fee when available, otherwise use the resolvedShippingFee (user-entered or parsed)
        shippingFee: calculatedShippingFee !== undefined ? calculatedShippingFee : resolvedShippingFee,
        location: shippingOption === "Meet-up" ? trimmedLocation : undefined,
        listed: true,
        sold: false,
        quantity: quantityValue, // 🔥 库存数量
      };

      const rootNavigator = navigation.getParent();
      // ✅ ConfirmSellScreen 会自己加载 benefits 并检查限制
      const confirmParams = isEditingDraft
        ? {
            mode: "update" as const,
            listingId: editingDraftId!,
            draft: { ...listingData, listed: true, sold: false },
            listingSnapshot: loadedDraft ?? undefined,
          }
        : {
            mode: "create" as const,
            draft: listingData,
          };

      if ((rootNavigator as any)?.navigate) {
        (rootNavigator as any).navigate("My TOP", {
          screen: "ConfirmSell",
          params: confirmParams,
        });
      } else {
        (navigation as any)?.navigate?.("ConfirmSell", confirmParams);
      }
    } catch (error) {
      console.error("Error preparing listing draft:", error);
      Alert.alert("Error", "Failed to prepare your listing. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  /** ---------- Derived “one bubble” AI summary ---------- */
  const bestAI: ClassifyResponse | null = React.useMemo(() => {
    const candidates = aiItems
      .map(i => i.classification)
      .filter((c): c is ClassifyResponse => !!c?.category);
    if (!candidates.length) return null;
    return candidates.reduce((a, b) => ((b.confidence ?? 0) > (a.confidence ?? 0) ? b : a));
  }, [aiItems]);

  const uiBestCategory = bestAI
    ? resolveCategoryFromOptions(bestAI.category) ?? bestAI.category
    : null;
  const topLabels = bestAI?.labels?.slice(0, 6) ?? [];
  const bestConfPct = bestAI?.confidence != null ? Math.round(bestAI.confidence * 100) : null;
  const headerTitle = isEditingDraft ? "Edit draft" : "Sell an item";
  const postButtonLabel = isEditingDraft ? "Post draft" : "Post listing";

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Header
        title={headerTitle}
        showBack={isEditingDraft}
        onBackPress={() => {
          // 从编辑草稿返回到 Drafts 页面，直接 goBack 应该从左边滑入
          navigation.goBack();
        }}
        rightAction={
          isEditingDraft
            ? undefined
            : (
              <TouchableOpacity onPress={() => navigation.navigate("Drafts")} style={{ paddingRight: 4 }}>
                <Icon name="file-tray-outline" size={22} color="#111" />
              </TouchableOpacity>
            )
        }
      />

      {initializingDraft ? (
        <View style={styles.draftLoadingContainer}>
          <ActivityIndicator size="small" color="#111" />
          <Text style={styles.draftLoadingText}>Loading draft…</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Photos row */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoRow}
          >
            {moderationChecking && (
              <View style={{ paddingVertical: 8, paddingRight: 12 }}>
                <ActivityIndicator />
              </View>
            )}

            {photos.length < PHOTO_LIMIT && (
              <TouchableOpacity style={styles.photoBox} onPress={handleAddPhoto}>
                <Icon name="add" size={24} color="#999" />
                <Text style={styles.photoAddHint}>Add photo</Text>
              </TouchableOpacity>
            )}

            {/* Each photo column */}
            {photos.map((photo, index) => {
              const info = findAI(photo.localUri);
              const isBusy =
                aiRunning && (info?.status === "classifying" || info?.status === "describing");

              return (
                <View key={photo.id} style={styles.photoColumn}>
                  {/* Image */}
                  <TouchableOpacity
                    style={styles.photoPreview}
                    onPress={() => setPreviewIndex(index)}
                  >
                    <Image source={{ uri: photo.localUri }} style={styles.photoPreviewImage} />
                    {photo.uploading ? (
                      <View style={styles.photoUploadingOverlay}>
                        <ActivityIndicator color="#fff" />
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.photoRemoveBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleRemovePhoto(photo.id);
                        }}
                      >
                        <Icon name="close" size={16} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>

                  {/* per-photo busy/error (compact) */}
                  {isBusy && (
                    <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <ActivityIndicator />
                      <Text style={{ fontSize: 12 }}>
                        {info?.status === "classifying" ? "Classifying…" : "Describing…"}
                      </Text>
                    </View>
                  )}
                  {!isBusy && info?.status === "error" && (
                    <Text style={{ color: "#B00020", marginTop: 6 }} numberOfLines={2}>
                      AI error: {info.error}
                    </Text>
                  )}
                </View>
              );
            })}
          </ScrollView>

          {/* 🔵 ONE consolidated AI bubble under the image row */}
          {(aiRunning || bestAI) && (
            <View style={styles.aiBubbleWrapOne}>
              <View style={styles.aiBubbleOne}>
                {aiRunning && !bestAI && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <ActivityIndicator />
                    <Text style={{ fontWeight: "600" }}>Analyzing photos…</Text>
                  </View>
                )}

                {bestAI && (
                  <View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <Icon name="sparkles" size={16} color="#5B21B6" />
                      <Text style={styles.aiBubbleTitle}>
                        Best match: {uiBestCategory}
                      </Text>
                    </View>

                    {bestConfPct !== null && (
                      <View style={styles.confBar}>
                        <View style={[styles.confFill, { width: `${Math.min(100, Math.max(0, bestConfPct))}%` }]} />
                        <Text style={styles.confText}>{bestConfPct}%</Text>
                      </View>
                    )}

                    {!!topLabels.length && (
                      <View style={styles.labelChipsRow}>
                        {topLabels.map((label) => (
                          <View key={label} style={styles.labelChip}>
                            <Text style={styles.labelChipText}>{label}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
              <View style={styles.aiBubbleTailOne} />
            </View>
          )}

          {/* ⬇️ Single global reclassify button (aligned under the padded photo row) */}
          <View style={styles.reclassifyAllWrap}>
            <TouchableOpacity
              onPress={handleReclassifyAll}
              disabled={moderationChecking || aiRunning || photos.length === 0}
              style={[
                styles.reclassifyAllBtn,
                (moderationChecking || aiRunning || photos.length === 0) && { opacity: 0.6 },
              ]}
            >
              {aiRunning ? (
                <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.reclassifyAllText}>Reclassifying…</Text>
                </View>
              ) : (
                <Text style={styles.reclassifyAllText}>Reclassify all photos</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => setShowGuide(true)}>
            <Text style={styles.photoTips}>Read our photo tips</Text>
          </TouchableOpacity>

          {/* === Required fields === */}
          <Text style={styles.sectionTitle}>
            Title <Text style={styles.requiredMark}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Enter a catchy title for your item"
            placeholderTextColor="#999"
            value={title}
            onChangeText={setTitle}
            maxLength={60}
            textAlignVertical="center"
          />
          <Text style={styles.charCount}>{title.length}/60</Text>

          <Text style={styles.sectionTitle}>
            Description <Text style={styles.requiredMark}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="eg. small grey Nike t-shirt, only worn a few times"
            placeholderTextColor="#999"
            multiline
            value={description}
            onChangeText={setDescription}
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{description.length}/500</Text>
          <TouchableOpacity style={styles.aiGenBtn} onPress={generateDescription}>
            <Text style={{ color: "#5B21B6", fontWeight: "600" }}>Generate with AI ✨</Text>
          </TouchableOpacity>

          {loading && <ActivityIndicator size="small" color="#5B21B6" />}
          {aiDesc && (
            <View style={styles.aiBox}>
              <TouchableOpacity style={styles.closeIcon} onPress={() => setAiDesc(null)}>
                <Icon name="close" size={20} color="#444" />
              </TouchableOpacity>

              <Text style={{ fontWeight: "600", marginBottom: 4 }}>
                Done! Use this to get started:
              </Text>
              <Text style={{ marginBottom: 8 }}>{aiDesc}</Text>

              <View style={styles.aiActionRow}>
                <TouchableOpacity style={styles.useSmallBtn} onPress={() => {
                  if (aiDesc) setDescription(aiDesc);
                  setAiDesc(null);
                  }}>
                  <Text style={{ color: "#fff", fontWeight: "600" }}>Use description</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Category - updates from AI unless user picks */}
          <Text style={styles.sectionTitle}>
            Category <Text style={styles.requiredMark}>*</Text>
          </Text>
          <TouchableOpacity style={styles.selectBtn} onPress={() => setShowCat(true)}>
            <Text style={styles.selectValue}>
              {category !== "Select" ? category : "Select"}
            </Text>
          </TouchableOpacity>

          {/* Condition */}
          <Text style={styles.sectionTitle}>
            Condition <Text style={styles.requiredMark}>*</Text>
          </Text>
          <TouchableOpacity style={styles.selectBtn} onPress={() => setShowCond(true)}>
            <Text style={styles.selectValue}>
              {condition !== "Select" ? condition : "Select"}
            </Text>
          </TouchableOpacity>

          {/* Gender - 必选 */}
          <Text style={styles.sectionTitle}>
            Gender <Text style={styles.requiredMark}>*</Text>
          </Text>
          <TouchableOpacity style={styles.selectBtn} onPress={() => setShowGender(true)}>
            <Text style={styles.selectValue}>{gender !== "Select" ? gender : "Select"}</Text>
          </TouchableOpacity>

          {/* Price */}
          <Text style={styles.sectionTitle}>
            Price <Text style={styles.requiredMark}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Enter price (e.g. 25.00)"
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
            textAlignVertical="center"
          />

          {/* 🔥 Quantity / Stock */}
          <Text style={styles.sectionTitle}>
            Stock Quantity <Text style={styles.requiredMark}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Enter stock quantity (e.g. 1)"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
            textAlignVertical="center"
          />
          <Text style={styles.helperText}>
            How many items are available for sale? (Minimum: 1)
          </Text>

          {/* Shipping */}
          <Text style={styles.sectionTitle}>
            Shipping <Text style={styles.requiredMark}>*</Text>
          </Text>
          <TouchableOpacity style={styles.selectBtn} onPress={() => setShowShip(true)}>
            <Text style={styles.selectValue}>
              {shippingOption !== "Select" ? shippingOption : "Select"}
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

          {/* === Optional fields === */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Additional Details (Optional)</Text>

          <Text style={styles.fieldLabel}>Brand</Text>
          <TouchableOpacity style={styles.selectBtn} onPress={() => setShowBrand(true)}>
            <Text style={styles.selectValue}>
              {brand !== "Select" ? brand : "Select"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>Size</Text>
          <TouchableOpacity style={styles.selectBtn} onPress={() => setShowSize(true)}>
            <Text style={styles.selectValue}>
              {size !== "Select" ? size : "Select"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>Material</Text>
          <TouchableOpacity style={styles.selectBtn} onPress={() => setShowMaterial(true)}>
            <Text style={styles.selectValue}>
              {material !== "Select" ? material : "Select"}
            </Text>
          </TouchableOpacity>

          {/* Tags */}
          <Text style={styles.fieldLabel}>Tags</Text>
          <Text style={{ color: "#555", marginBottom: 6, fontSize: 13 }}>
            Add up to 5 tags to help buyers find your item
          </Text>

          <View style={styles.tagContainer}>
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
                    <TouchableOpacity onPress={() => setTags(tags.filter((t) => t !== tag))}>
                      <Icon name="close" size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                {tags.length < 5 && (
                  <TouchableOpacity style={styles.addStyleBtnSmall} onPress={() => setShowTagPicker(true)}>
                    <Icon name="add" size={16} color="#F54B3D" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.draftBtn, (savingDraft || initializingDraft) && styles.draftBtnDisabled]}
              onPress={handleSaveDraft}
              disabled={savingDraft || initializingDraft}
            >
              {savingDraft ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.draftText}>Save to drafts</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.postBtn, (saving || initializingDraft) && styles.postBtnDisabled]}
              onPress={handlePostListing}
              disabled={saving || initializingDraft}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.postText}>{postButtonLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      )}

      {/* Pickers */}
      <OptionPicker
        title="Select gender"
        visible={showGender}
        options={GENDER_OPTIONS}
        value={gender}
        onClose={() => setShowGender(false)}
        onSelect={setGender}
      />
      <OptionPicker
        title="Select category"
        visible={showCat}
        options={categoryOptions}
        value={category}
        onClose={() => setShowCat(false)}
        onSelect={(val) => {
          setCategory(val);
          setUserPickedCategory(true); // lock user choice
        }}
      />
      <BrandPickerModal
        visible={showBrand}
        onClose={() => setShowBrand(false)}
        value={brand}
        onSelect={handleSelectBrand}
      />
      <OptionPicker
        title="Select condition"
        visible={showCond}
        options={CONDITION_OPTIONS}
        value={condition}
        onClose={() => setShowCond(false)}
        onSelect={setCondition}
      />

      {/* Image Preview Modal */}
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
                <Image source={{ uri: photo.localUri }} style={styles.previewModalImage} resizeMode="contain" />
              </View>
            ))}
          </ScrollView>

          <View style={styles.previewTopBar}>
            <View style={styles.previewIndicator}>
              <Text style={styles.previewIndicatorText}>
                {(previewIndex ?? 0) + 1} / {photos.length}
              </Text>
            </View>
            <TouchableOpacity style={styles.previewCloseBtn} onPress={() => setPreviewIndex(null)}>
              <Icon name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          {photos.length > 1 && (
            <View style={styles.previewBottomBar}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailContainer}>
                {photos.map((photo, index) => (
                  <TouchableOpacity
                    key={photo.id}
                    style={[styles.thumbnail, index === previewIndex && styles.thumbnailActive]}
                    onPress={() => {
                      setPreviewIndex(index);
                      scrollViewRef.current?.scrollTo({ x: index * Dimensions.get("window").width, animated: true });
                    }}
                  >
                    <Image source={{ uri: photo.localUri }} style={styles.thumbnailImage} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>

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
        visible={showMaterial}
        options={MATERIAL_OPTIONS}
        value={material}
        onClose={() => setShowMaterial(false)}
        onSelect={setMaterial}
      />
      <OptionPicker
        title="Select shipping option"
        visible={showShip}
        options={SHIPPING_OPTIONS}
        value={shippingOption}
        onClose={() => setShowShip(false)}
        onSelect={(val) => {
          setShippingOption(val);
          if (val !== "Buyer pays – fixed fee") setShippingFee("");
          if (val !== "Meet-up") setLocation("");
        }}
      />

      {/* Tag Picker Modal */}
      <TagPickerModal visible={showTagPicker} onClose={() => setShowTagPicker(false)} tags={tags} setTags={setTags} />

      {/* Photo Standards Guide Modal */}
      <Modal visible={showGuide} animationType="slide" transparent onRequestClose={() => setShowGuide(false)}>
        <Pressable style={styles.guideOverlay} onPress={() => setShowGuide(false)} />
        <View style={styles.guideModal}>
          <View style={styles.guideHeader}>
            <TouchableOpacity onPress={() => setShowGuide(false)}>
              <Icon name="close-outline" size={28} color="#111" />
            </TouchableOpacity>
            <Text style={styles.guideTitle}>Photo Standards Guide</Text>
            <View style={{ width: 28 }} />
          </View>
          <ScrollView contentContainerStyle={styles.guideContent}>
            <Text style={styles.guideText}>
              If your listing photos don’t meet our standards, we may ask you to resubmit before it goes live. Follow these tips to make your item stand out and get approved faster.
            </Text>

            <Text style={styles.guideSectionTitle}>1. Use Natural Light 🌤️</Text>
            <Text style={styles.guideText}>
              Shoot in daylight near a window — natural light shows true appearance. Avoid dark rooms or harsh flash that can distort your item's appearance.
            </Text>

            <Text style={styles.guideSectionTitle}>2. Keep It Clean & Simple 🧺</Text>
            <Text style={styles.guideText}>
              Use a plain, solid background (white or neutral color). Remove clutter and avoid filters or heavy edits that alter color accuracy.
            </Text>

            <Text style={styles.guideSectionTitle}>3. Show the Full Item 👕</Text>
            <Text style={styles.guideText}>
              Better include at least 4–5 photos covering all key angles:
              {"\n"}• Full view — entire item laid flat or hung
              {"\n"}• Brand tag — clear logo shot
              {"\n"}• Details — close-up of texture or stitching
              {"\n"}• Flaws — any wear or damage
              {"\n"}• Optional — on-body shot to show fit
            </Text>

            <Text style={styles.guideSectionTitle}>4. Be Honest 💬</Text>
            <Text style={styles.guideText}>
              Only upload photos of your actual item. Do not use stock images. Make sure textures are true to life.
            </Text>

            <Text style={[styles.guideSectionTitle, { marginTop: 16 }]}>✅ Summary</Text>
            <Text style={styles.guideText}>Clear light, clean background, honest details. Photos should look natural, simple, and professional.</Text>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
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

  const filtered = DEFAULT_TAGS.filter((t) => t.toLowerCase().includes(search.toLowerCase()));

  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag) && tags.length < 5) {
      setTags([...tags, tag]);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="slide">
      <Pressable style={styles.sheetMask} onPress={onClose} />
      <View style={styles.tagSheet}>
        <View style={styles.tagSheetHeader}>
          <Text style={styles.tagSheetTitle}>Select tags</Text>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={24} color="#111" />
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.tagSearch}
          placeholder="Search tags..."
          value={search}
          onChangeText={setSearch}
          textAlignVertical="center"
        />

        <ScrollView style={{ maxHeight: 360 }}>
          <View style={styles.tagGrid}>
            {filtered.map((t) => {
              const selected = tags.includes(t);
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.tagOption, selected && styles.tagOptionSelected]}
                  onPress={() => (selected ? setTags(tags.filter((x) => x !== t)) : addTag(t))}
                >
                  <Text style={[styles.tagOptionText, selected && { color: "#fff" }]}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

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

        <TouchableOpacity style={styles.sheetDone} onPress={onClose}>
          <Text style={{ fontWeight: "600" }}>Done</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

/** --- Styles --- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  draftLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 80,
  },
  draftLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },

  photoRow: {
    paddingVertical: 4,
    paddingHorizontal: 16, // align with button/bubble below
    alignItems: "flex-start",
  },
  photoColumn: {
    width: 120,
    marginRight: 12,
    alignItems: "stretch",
  },

  photoBox: {
    width: 120,
    height: 120,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fafafa",
    marginRight: 12,
  },
  photoAddHint: { marginTop: 8, fontSize: 12, color: "#666" },

  photoPreview: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f1f1f1",
    position: "relative",
  },
  photoPreviewImage: { width: "100%", height: "100%" },
  photoUploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoRemoveBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },

  /* ONE AI speech bubble (consolidated) */
  aiBubbleWrapOne: {
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 16,
    alignItems: "flex-start",
  },
  aiBubbleOne: {
    backgroundColor: "#F6F6FF",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E2E2F5",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    width: "100%",
  },
  aiBubbleTailOne: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 12,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#F6F6FF",
    marginLeft: 26,
  },
  aiBubbleTitle: { fontWeight: "700", color: "#111" },

  confBar: {
    height: 18,
    borderRadius: 999,
    backgroundColor: "#EEE",
    overflow: "hidden",
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 6,
  },
  confFill: {
    ...StyleSheet.absoluteFillObject,
    width: "0%",
    backgroundColor: "#5B21B6",
    borderRadius: 999,
  },
  confText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },

  labelChipsRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  labelChip: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: "#eee",
    marginRight: 6,
    marginBottom: 6,
  },
  labelChipText: { fontSize: 12 },

  /* Global reclassify button under photos */
  reclassifyAllWrap: {
    marginTop: 8,
    marginBottom: 12,
    width: "100%",
    paddingHorizontal: 16, // match row/bubble padding
  },
  reclassifyAllBtn: {
    backgroundColor: "#111",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  reclassifyAllText: { color: "#fff", fontWeight: "700" },

  photoTips: { fontSize: 14, color: "#5B21B6", marginBottom: 16 },

  sectionTitle: { fontSize: 16, fontWeight: "600", marginTop: 12, marginBottom: 8 },
  requiredMark: { color: "#F54B3D", fontWeight: "700" },
  fieldLabel: { fontSize: 14, fontWeight: "500", color: "#333", marginBottom: 6, marginTop: 8 },
  charCount: { fontSize: 12, color: "#999", textAlign: "right", marginTop: -8, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "android" ? 0 : 10,
    marginBottom: 12,
    fontSize: 15,
    backgroundColor: "#fafafa",
    minHeight: 46,
    includeFontPadding: false,
  },
  helperText: { fontSize: 12, color: "#666", marginTop: -8, marginBottom: 12 }, // 🔥 Helper text style

  aiGenBtn: { alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: "#5B21B6", borderRadius: 20, marginBottom: 12 },
  aiBox: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, marginBottom: 12, backgroundColor: "#F3E8FF", position: "relative" },
  closeIcon: { position: "absolute", top: 8, right: 8 },
  aiActionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  useSmallBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, backgroundColor: "#5B21B6" },

  selectBtn: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 12, width: "100%" },
  selectValue: { fontSize: 15, color: "#111" },

  footer: { flexDirection: "row", justifyContent: "space-between", marginTop: 20 },
  draftBtn: { flex: 1, borderWidth: 1, borderColor: "#000", borderRadius: 25, paddingVertical: 12, alignItems: "center", marginRight: 8 },
  draftBtnDisabled: { opacity: 0.6 },
  draftText: { fontWeight: "600", fontSize: 16 },
  postBtn: { flex: 1, backgroundColor: "#000", borderRadius: 25, paddingVertical: 12, alignItems: "center", marginLeft: 8 },
  postText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  postBtnDisabled: { backgroundColor: "#ccc", opacity: 0.6 },

  sheetMask: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.25)" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  sheetHandle: { alignSelf: "center", width: 44, height: 5, borderRadius: 999, backgroundColor: "#DDD", marginBottom: 8 },
  sheetTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  optionRow: { paddingVertical: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: "#eee", borderRadius: 10, marginBottom: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  optionText: { fontSize: 15, color: "#111" },
  sheetCancel: { marginTop: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: "#F6F6F6", alignItems: "center" },

  guideOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)" },
  guideModal: { position: "absolute", bottom: 0, left: 0, right: 0, height: "66%", backgroundColor: "#fff", borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: "hidden" },
  guideHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#ddd" },
  guideTitle: { fontSize: 17, fontWeight: "700", color: "#111" },
  guideContent: { paddingHorizontal: 20, paddingVertical: 16 },

  guideSectionTitle: { fontWeight: "700", fontSize: 15, marginTop: 14, marginBottom: 6, color: "#111" },
  guideText: { fontSize: 14, color: "#333", lineHeight: 20 },
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f1f1",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
  },
  tagText: {
    fontSize: 14,
  },
  addStyleBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F54B3D",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  addStyleText: {
    color: "#F54B3D",
    fontWeight: "600",
    marginLeft: 4,
  },
  selectedTagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagChipText: {
    color: "#fff",
    fontSize: 14,
    marginRight: 4,
  },
  addStyleBtnSmall: {
    borderWidth: 1,
    borderColor: "#F54B3D",
    borderRadius: 20,
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
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
});
