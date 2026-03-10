import { Prisma } from "@prisma/client";
import { updateThemeScores } from "../services/theme-score";

export async function runUpdateThemeScoresJob(): Promise<void> {
  try {
    const result = await updateThemeScores();
    console.log(
      `Theme score update complete: themeScores(upserted=${result.upserted}, reset=${result.reset})`,
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2021"
    ) {
      console.warn(
        "Theme score update skipped because ThemeEvent or ThemeScore table is missing. Run the latest Prisma migrations first.",
      );
      return;
    }

    throw error;
  }
}
