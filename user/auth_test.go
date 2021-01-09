package user

import "testing"

func TestAuth_Authenticate(t *testing.T) {
	prof := NewProfilesDB("./","password")
	prof.AddUser("shurik","prikluchenija")

	auth := NewAuth("password",prof)

	if !auth.Authenticate("shurik","prikluchenija") {
		t.Fatal("Authentication failed 1 ")
	}
	if auth.Authenticate("shurik","world") {
		t.Fatal("Authentication failed 2 ")
	}
	prof.SaveUserDB()


	//auth2 := NewAuth("./","password")
	//auth2.LoadUserDB()
	//if !auth2.Authenticate("shurik","prikluchenija") {
	//	t.Fatal("Authentication failed 3 ")
	//}

}
