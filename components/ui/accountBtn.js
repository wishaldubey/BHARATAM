import { signIn } from "next-auth/react";
import { useTranslation } from "next-i18next";
import { FaInstagram } from "react-icons/fa";

export default function AccountBtn({ session, openAccountModal, navbarMode }) {
  const { t: text } = useTranslation("common");

  return (
    <>
      {!session || !session?.token?.secret ? (
        <button
          className={`gameBtn ${navbarMode ? "navBtn" : "accountBtn"}`}
          onClick={() => session === null && signIn("google")}
        >
          {!session?.token?.secret && session !== null ? (
            "..."
          ) : (
            <>{text("login")}</>
          )}
        </button>
      ) : (
        <button
          className={`gameBtn ${navbarMode ? "navBtn" : "accountBtn"}`}
          onClick={() => openAccountModal()}
        >
          {session?.token?.username ? (
            <p style={{ color: "white", marginRight: "10px" }}>
              {session?.token?.username}
            </p>
          ) : null}
        </button>
      )}
    </>
  );
}
