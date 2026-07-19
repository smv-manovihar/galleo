# 1. Force the installer to display the Component/Checkbox selection page
!macro customHeader
  !define NTDDI_VERSION 0x06010000 ; Target Windows 7+
  ShowUninstDetails show

  # Declare custom sections at the top-level (so they are registered as components)
  # These are dummy sections that serve as checkboxes. The shortcuts are actually
  # created in customInstall after files are successfully copied.
  Section "Create Desktop Shortcut" SecDesktop
  SectionEnd

  Section "Create Start Menu Shortcut" SecStartMenu
  SectionEnd
!macroend

# 2. Inject the Components selection page into the page flow
!macro customPageAfterChangeDir
  !define MUI_COMPONENTSPAGE_NODESC
  !insertmacro MUI_PAGE_COMPONENTS
!macroend

# 3. Configure section flags during initialization
!macro customInit
  # Make the main "install" section Checked (1) and Read-Only (16) -> flag 17
  # This prevents the user from unchecking the core application files.
  # We use the literal index 2 because the main section identifier is defined
  # after .onInit (where customInit runs) and is not yet available at compile time.
  SectionSetText 2 "Galleo Application (Required)"
  SectionSetFlags 2 17
!macroend

# 4. Create the shortcuts after files are successfully copied
!macro customInstall
  # Create Desktop shortcut if checked
  SectionGetFlags ${SecDesktop} $R0
  IntOp $R0 $R0 & 1
  ${If} $R0 == 1
    CreateShortCut "$DESKTOP\Galleo.lnk" "$INSTDIR\Galleo.exe"
  ${EndIf}

  # Create Start Menu shortcut if checked
  SectionGetFlags ${SecStartMenu} $R0
  IntOp $R0 $R0 & 1
  ${If} $R0 == 1
    CreateDirectory "$SMPROGRAMS\Galleo"
    CreateShortCut "$SMPROGRAMS\Galleo\Galleo.lnk" "$INSTDIR\Galleo.exe"
  ${EndIf}
!macroend

# 5. Clean up the shortcuts properly during uninstallation
!macro customUnInstall
  # Only delete shortcuts if the user is actually uninstalling (not auto-updating)
  ${IfNot} ${isUpdated}
    Delete "$DESKTOP\Galleo.lnk"
    Delete "$SMPROGRAMS\Galleo\Galleo.lnk"
    RMDir "$SMPROGRAMS\Galleo"
  ${EndIf}
!macroend
