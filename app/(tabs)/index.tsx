import EmptyState from "@/src/components/EmptyState";
import QuestionCard from "@/src/components/QuestionCard";
import { auth } from "@/src/lib/firebase";
import { logout } from "@/src/services/auth.service";
import { getUserQuestions } from "@/src/services/question.service";
import type { Question } from "@/src/types/question";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from "react-native";

export default function HomeScreen() {
    const [items, setItems] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        const user = auth.currentUser;

        setLoading(true);
        try {
            if (!user) {
                console.log("Home: user yok (auth.currentUser null)");
                setItems([]);
                return;
            }

            console.log("Home: uid =", user.uid);

            const data = await getUserQuestions(user.uid);

            console.log("Home: gelen kayıt sayısı =", data.length);
            if (data[0]) console.log("Home: ilk kayıt =", data[0]);

            setItems(data);
        } catch (e: any) {
            console.log("Home: getUserQuestions HATA =", e);
            Alert.alert("Liste Hatası", e?.message ?? "Bilinmeyen hata");
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    return (
        <View className="flex-1 bg-black">
            <View className="pt-14 px-6 pb-4 flex-row items-center justify-between">
                <Text className="text-2xl font-bold text-white">Sorular</Text>

                <Pressable
                    onPress={async () => {
                        await logout();
                        router.replace("/(auth)/login");
                    }}
                    className="rounded-xl bg-white/10 px-4 py-2 border border-white/10"
                >
                    <Text className="text-white">Çıkış</Text>
                </Pressable>
            </View>

            {loading ? (
                <View className="flex-1 items-center justify-center">
                    <ActivityIndicator />
                </View>
            ) : items.length === 0 ? (
                <EmptyState />
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={(i) => i.id}
                    contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
                    renderItem={({ item }) => (
                        <QuestionCard
                            item={item}
                            onPress={() =>
                                router.push({
                                    pathname: "/(tabs)/detail/[id]",
                                    params: { id: item.id },
                                })
                            }
                        />
                    )}
                />
            )}
        </View>
    );
}