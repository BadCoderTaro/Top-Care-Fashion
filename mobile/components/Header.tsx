import React from "react"
import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import Icon from "./Icon"

type HeaderProps = {
	title: string
	showBack?: boolean // 默认 false
	onBackPress?: () => void
	rightAction?: React.ReactNode // 右侧自定义按钮
	bgColor?: string // ✅ 背景颜色（默认白色）
	textColor?: string // ✅ 标题颜色（默认黑色）
	iconColor?: string // ✅ 图标颜色（默认黑色）
}

const Header: React.FC<HeaderProps> = ({
	title,
	showBack = false,
	onBackPress,
	rightAction,
	bgColor = "#fff",
	textColor = "#000",
	iconColor = "#000",
}) => {
	const navigation = useNavigation()

	return (
		<SafeAreaView edges={["top"]} style={{ backgroundColor: bgColor }}>
			<View style={[styles.header, { borderBottomColor: bgColor === "#fff" ? "#ddd" : bgColor }]}>
				{/* 左侧返回按钮 */}
				{showBack ? (
					<TouchableOpacity
						style={styles.backBtn}
						onPress={onBackPress || (() => navigation.goBack())}
						hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
					>
						<Icon name="arrow-back" size={26} color={iconColor} />
					</TouchableOpacity>
				) : (
					<View style={styles.backBtnPlaceholder} />
				)}

				{/* 标题 */}
				<Text style={[styles.title, { color: textColor }]}>{title}</Text>

				{/* 右侧按钮 */}
				<View style={styles.right}>{rightAction}</View>
			</View>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	header: {
		height: 56,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 16,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	backBtn: {
		padding: 6,
		alignItems: "center",
		justifyContent: "center",
	},
	backBtnPlaceholder: {
		width: 26, // 占位，保持标题居中
	},
	title: {
		fontSize: 18,
		fontWeight: "700",
		position: "absolute",
		left: 0,
		right: 0,
		textAlign: "center",
	},
	right: {
		minWidth: 26,
		alignItems: "flex-end",
	},
})

export default Header
