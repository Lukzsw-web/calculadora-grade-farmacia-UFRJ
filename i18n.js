/* Planejador Acadêmico — idiomas (pt-BR, es, en).
 * As chaves são os próprios textos em português. Textos fixos do HTML são trocados na carga
 * (data-i18n-html para trechos com marcação); textos gerados por script usam I18N.t().
 * Nomes de disciplinas e dados dos contatos (nomes, e-mails, salas) são dados do currículo e não são traduzidos.
 * Trocar de idioma salva a escolha e recarrega a página, para tudo nascer no idioma certo. */
(function () {
  'use strict';
  var KEY = 'planejador_lang_v1';
  var SUPPORTED = ['pt', 'es', 'en'];
  var HTML_LANG = { pt: 'pt-BR', es: 'es', en: 'en' };
  var lang = 'pt';
  try { var saved = localStorage.getItem(KEY); if (SUPPORTED.indexOf(saved) >= 0) lang = saved; } catch (_) {}

  // [português, inglês, espanhol]
  var ROWS = [
    // ---- Estrutura geral ----
    ['Planejador Acadêmico - Farmácia', 'Academic Planner - Pharmacy', 'Planificador Académico - Farmacia'],
    ['Planejador Acadêmico', 'Academic Planner', 'Planificador Académico'],
    ['Farmácia - UFRJ', 'Pharmacy - UFRJ', 'Farmacia - UFRJ'],
    ['Pesquisar', 'Search', 'Buscar'],
    ['Buscar disciplina, código ou período...', 'Search course, code or term...', 'Buscar asignatura, código o período...'],
    ['Limpar texto', 'Clear text', 'Borrar texto'],
    ['Salvo', 'Saved', 'Guardado'],
    ['Créditos', 'Credits', 'Créditos'],
    ['Carga Horária', 'Workload', 'Carga horaria'],
    ['Disciplinas', 'Courses', 'Asignaturas'],
    ['Graduação', 'Degree', 'Carrera'],
    ['Obrigatórias', 'Required', 'Obligatorias'],
    ['restam)', 'left)', 'restan)'],
    ['Condicionadas', 'Conditional', 'Condicionadas'],
    ['Meta: 12 créd. / 180h', 'Goal: 12 cr. / 180h', 'Meta: 12 créd. / 180h'],
    ['0 créd. • 0h', '0 cr. • 0h', '0 créd. • 0h'],
    ['{c} créd. • {h}h', '{c} cr. • {h}h', '{c} créd. • {h}h'],
    ['Limpar tudo: desmarcar todas as disciplinas concluídas', 'Clear all: uncheck every completed course', 'Borrar todo: desmarcar todas las asignaturas cursadas'],
    ['Limpar tudo', 'Clear all', 'Borrar todo'],
    ['Legenda dos estados das disciplinas', 'Course status legend', 'Leyenda de los estados de las asignaturas'],
    ['Cursada', 'Completed', 'Cursada'],
    ['Disponível', 'Available', 'Disponible'],
    ['Bloqueada', 'Locked', 'Bloqueada'],
    ['Ferramenta de caráter auxiliar, sua utilização não substitui a consulta do BOA. Site feito de aluno para aluno, sem relação com a UFRJ.',
      'An auxiliary tool: using it does not replace checking BOA. A site made by a student for students, with no affiliation to UFRJ.',
      'Herramienta auxiliar: su uso no sustituye la consulta del BOA. Sitio hecho de estudiante para estudiantes, sin relación con la UFRJ.'],
    ['Navegação principal', 'Main navigation', 'Navegación principal'],
    ['Planejador', 'Planner', 'Planificador'],
    ['O que puxar?', 'What to take?', '¿Qué cursar?'],
    ['Contatos Importantes', 'Important Contacts', 'Contactos importantes'],
    ['Contatos', 'Contacts', 'Contactos'],
    ['Configurações', 'Settings', 'Configuración'],
    ['Fechar', 'Close', 'Cerrar'],
    ['Escolha Condicionada', 'Conditional Electives', 'Optativas Condicionadas'],
    ['Escolha condicionada', 'Conditional electives', 'Optativas condicionadas'],
    ['Disciplinas de Escolha Condicionada são as eletivas do currículo novo. Basicamente você precisa ter 12 créditos e 180 horas dessas matérias para se formar.',
      'Conditional Elective courses are the electives of the new curriculum. Basically, you need 12 credits and 180 hours of these courses to graduate.',
      'Las asignaturas de Elección Condicionada son las optativas del nuevo currículo. Básicamente necesitas 12 créditos y 180 horas de estas asignaturas para graduarte.'],
    ['O uso desse site é puramente de caráter auxiliar e não substitui a consulta do BOA.', 'Using this site is purely auxiliary and does not replace checking BOA.', 'El uso de este sitio es puramente auxiliar y no sustituye la consulta del BOA.'],
    ['Buscar por nome ou e-mail...', 'Search by name or e-mail...', 'Buscar por nombre o correo...'],
    ['Como Usar', 'How to Use', 'Cómo usar'],
    ['Marque as disciplinas concluídas. O sistema calcula progresso e desbloqueia as próximas automaticamente.', 'Check the courses you have completed. The system calculates your progress and unlocks the next ones automatically.', 'Marca las asignaturas cursadas. El sistema calcula el progreso y desbloquea las siguientes automáticamente.'],
    ['Clique e segure no nome de qualquer matéria para ver pré-requisitos e detalhes detalhados.', 'Press and hold any course name to see prerequisites and details.', 'Mantén presionado el nombre de cualquier asignatura para ver prerrequisitos y detalles.'],
    ['Código', 'Code', 'Código'],
    ['Códigos', 'Codes', 'Códigos'],
    ['Período', 'Term', 'Período'],
    ['Pré-requisitos:', 'Prerequisites:', 'Prerrequisitos:'],
    ['Co-requisitos:', 'Co-requisites:', 'Correquisitos:'],
    ['Sim', 'Yes', 'Sí'],
    ['Não', 'No', 'No'],
    ['Meta concluída', 'Goal reached', 'Meta alcanzada'],
    ['Você atingiu os <strong>12 créditos</strong> e <strong>180 horas</strong> necessários de Escolha Condicionada.',
      'You have reached the <strong>12 credits</strong> and <strong>180 hours</strong> required for Conditional Electives.',
      'Alcanzaste los <strong>12 créditos</strong> y las <strong>180 horas</strong> necesarios de Elección Condicionada.'],

    // ---- Aba "O que puxar?" ----
    ['Organize sua grade aqui com somente as disciplinas que pode puxar', 'Build your schedule here using only the courses you can take', 'Organiza tu horario aquí solo con las asignaturas que puedes cursar'],
    ['Resumo do período planejado', 'Planned term summary', 'Resumen del período planificado'],
    ['RESUMO DA SUA GRADE', 'YOUR SCHEDULE SUMMARY', 'RESUMEN DE TU HORARIO'],
    ['Próximo período', 'Next term', 'Próximo período'],
    ['Créditos selecionados', 'Selected credits', 'Créditos seleccionados'],
    ['créd.', 'cr.', 'créd.'],
    ['Créd.', 'Cr.', 'Créd.'],
    ['créditos', 'credits', 'créditos'],
    ['Carga horária', 'Workload', 'Carga horaria'],
    ['Matérias puxadas', 'Courses selected', 'Asignaturas elegidas'],
    ['Matérias disponíveis', 'Courses available', 'Asignaturas disponibles'],
    ['Copiar códigos', 'Copy codes', 'Copiar códigos'],
    ['Limpar seleção', 'Clear selection', 'Borrar selección'],
    ['ENCONTRE UMA DISCIPLINA', 'FIND A COURSE', 'ENCUENTRA UNA ASIGNATURA'],
    ['Nome ou código da disciplina', 'Course name or code', 'Nombre o código de la asignatura'],
    ['Buscar entre as disciplinas disponíveis', 'Search among available courses', 'Buscar entre las asignaturas disponibles'],
    ['Limpar pesquisa', 'Clear search', 'Borrar búsqueda'],
    ['Sugestões de disciplinas disponíveis', 'Suggestions of available courses', 'Sugerencias de asignaturas disponibles'],
    ['Todas as disciplinas disponíveis', 'All available courses', 'Todas las asignaturas disponibles'],
    ['Disciplinas disponíveis', 'Available courses', 'Asignaturas disponibles'],
    ['Toque para selecionar', 'Tap to select', 'Toca para seleccionar'],
    ['Nenhuma disciplina encontrada', 'No courses found', 'No se encontró ninguna asignatura'],
    ['Tente outro nome ou código.', 'Try another name or code.', 'Prueba con otro nombre o código.'],
    ['Nenhuma disciplina disponível com esse nome.', 'No available course with that name.', 'No hay asignaturas disponibles con ese nombre.'],
    ['{n} disciplina disponível', '{n} course available', '{n} asignatura disponible'],
    ['{n} disciplinas disponíveis', '{n} courses available', '{n} asignaturas disponibles'],
    ['{n} disciplina encontrada', '{n} course found', '{n} asignatura encontrada'],
    ['{n} disciplinas encontradas', '{n} courses found', '{n} asignaturas encontradas'],
    ['Mostrando {shown} de {total}. Continue digitando para refinar.', 'Showing {shown} of {total}. Keep typing to refine.', 'Mostrando {shown} de {total}. Sigue escribiendo para afinar.'],
    ['Sugestões de disciplinas disponíveis', 'Suggestions of available courses', 'Sugerencias de asignaturas disponibles'],
    ['Nenhuma obrigatória disponível para puxar.', 'No required course available to take.', 'No hay asignaturas obligatorias disponibles para cursar.'],
    ['Quando você concluir os pré-requisitos de uma matéria, ela aparecerá aqui.', 'When you complete the prerequisites of a course, it will appear here.', 'Cuando completes los prerrequisitos de una asignatura, aparecerá aquí.'],
    ['Nenhuma condicionada disponível para puxar.', 'No conditional course available to take.', 'No hay asignaturas condicionadas disponibles para cursar.'],
    ['As condicionadas aparecem aqui assim que seus pré-requisitos forem cumpridos.', 'Conditional courses appear here as soon as their prerequisites are met.', 'Las condicionadas aparecen aquí en cuanto se cumplan sus prerrequisitos.'],
    ['<strong>Limite do SIGA:</strong> você selecionou {n} créditos. O SIGA não permite puxar mais de {max} créditos. Retire alguma disciplina.',
      '<strong>SIGA limit:</strong> you selected {n} credits. SIGA does not allow taking more than {max} credits. Remove a course.',
      '<strong>Límite del SIGA:</strong> seleccionaste {n} créditos. El SIGA no permite cursar más de {max} créditos. Quita alguna asignatura.'],
    ['<strong>Carga mínima:</strong> você selecionou {n} créditos. O SIGA não permite puxar menos de {min} créditos. Marque mais alguma disciplina.',
      '<strong>Minimum load:</strong> you selected {n} credits. SIGA does not allow taking fewer than {min} credits. Select another course.',
      '<strong>Carga mínima:</strong> seleccionaste {n} créditos. El SIGA no permite cursar menos de {min} créditos. Marca alguna asignatura más.'],

    // ---- Cards, períodos e detalhes ----
    ['{n}º Período', 'Term {n}', '{n}.º Período'],
    ['{n}º período', 'Term {n}', '{n}.º período'],
    ['{n} Matéria', '{n} Course', '{n} Asignatura'],
    ['{n} Matérias', '{n} Courses', '{n} Asignaturas'],
    ['Marcar', 'Check all', 'Marcar'],
    ['Selecionar {name} para o planejamento', 'Select {name} for planning', 'Seleccionar {name} para la planificación'],
    ['Marcar {name}', 'Check {name}', 'Marcar {name}'],
    ['Limpar', 'Clear', 'Borrar'],
    ['Informações', 'Information', 'Información'],
    ['Informações sobre Escolha Condicionada', 'Information about Conditional Electives', 'Información sobre Elección Condicionada'],
    ['Ver detalhes', 'View details', 'Ver detalles'],
    ['Ver detalhes de {name}', 'View details of {name}', 'Ver detalles de {name}'],
    ['Ver co-requisito', 'View co-requisite', 'Ver correquisito'],
    ['Ver co-requisito de {name}', 'View co-requisite of {name}', 'Ver correquisito de {name}'],
    ['Copiar código', 'Copy code', 'Copiar código'],
    ['Copiar código {code}', 'Copy code {code}', 'Copiar código {code}'],
    ['Nenhum', 'None', 'Ninguno'],
    ['Pré-requisito de 1 matéria', 'Prerequisite for 1 course', 'Prerrequisito de 1 asignatura'],
    ['Pré-requisito de {n} matérias', 'Prerequisite for {n} courses', 'Prerrequisito de {n} asignaturas'],
    ['Pré-req. de {n}', 'Prereq. for {n}', 'Prerreq. de {n}'],
    ['Essa matéria possui {names} como co-requisito, ou seja, devem ser cursadas simultaneamente no mesmo período.',
      'This course has {names} as a co-requisite, meaning they must be taken together in the same term.',
      'Esta asignatura tiene a {names} como correquisito, es decir, deben cursarse simultáneamente en el mismo período.'],
    ['A matéria {nome} não tranca nenhuma matéria!', 'The course {nome} does not lock any course!', '¡La asignatura {nome} no bloquea ninguna asignatura!'],
    ['A matéria {nome} tranca a seguinte matéria:', 'The course {nome} locks the following course:', 'La asignatura {nome} bloquea la siguiente asignatura:'],
    ['A matéria {nome} tranca as seguintes matérias:', 'The course {nome} locks the following courses:', 'La asignatura {nome} bloquea las siguientes asignaturas:'],
    ['Já cursada', 'Completed', 'Ya cursada'],
    ['Puxável', 'Can take', 'Se puede cursar'],
    ['Não puxável', 'Cannot take', 'No se puede cursar'],
    ['Sem pré-requisito', 'No prerequisite', 'Sin prerrequisito'],
    ['Remover filtro {label}', 'Remove filter {label}', 'Quitar filtro {label}'],
    ['Filtros interpretados', 'Detected filters', 'Filtros detectados'],
    ['Pesquisas recentes', 'Recent searches', 'Búsquedas recientes'],
    ['Digite o nome, código, período, créditos, horas ou um status.', 'Type a name, code, term, credits, hours or a status.', 'Escribe el nombre, código, período, créditos, horas o un estado.'],
    ['{n} resultado', '{n} result', '{n} resultado'],
    ['{n} resultados', '{n} results', '{n} resultados'],
    ['{n} resultado com esse filtro', '{n} result with this filter', '{n} resultado con ese filtro'],
    ['{n} resultados com esse filtro', '{n} results with this filter', '{n} resultados con ese filtro'],
    ['Nenhuma disciplina encontrada.', 'No courses found.', 'No se encontró ninguna asignatura.'],
    ['Tente outro nome, código, período, créditos ou um filtro como “disponíveis”.', 'Try another name, code, term, credits or a filter such as “available”.', 'Prueba con otro nombre, código, período, créditos o un filtro como “disponibles”.'],
    ['Disciplina selecionada', 'Course selected', 'Asignatura seleccionada'],
    ['Nenhum professor encontrado.', 'No professor found.', 'No se encontró ningún profesor.'],
    ['Tente outro nome ou parte do e-mail.', 'Try another name or part of the e-mail.', 'Prueba con otro nombre o parte del correo.'],
    ['Chefe:', 'Head:', 'Jefe:'],
    ['LOCAL:', 'LOCATION:', 'UBICACIÓN:'],
    ['Bloco', 'Block', 'Bloque'],
    ['Sala', 'Room', 'Sala'],
    ['andar', 'floor', 'piso'],
    ['Progresso das disciplinas obrigatórias: {p}%', 'Required courses progress: {p}%', 'Progreso de las asignaturas obligatorias: {p}%'],
    ['Progresso das disciplinas de Escolha Condicionada: {p}%', 'Conditional Electives progress: {p}%', 'Progreso de las asignaturas de Elección Condicionada: {p}%'],

    // ---- Avisos, confirmações e desfazer ----
    ['Desfazer', 'Undo', 'Deshacer'],
    ['Confirmar ação', 'Confirm action', 'Confirmar acción'],
    ['Limpar tudo?', 'Clear all?', '¿Borrar todo?'],
    ['Deseja realmente limpar todas as matérias marcadas como concluídas?', 'Do you really want to clear all courses marked as completed?', '¿Realmente quieres borrar todas las asignaturas marcadas como cursadas?'],
    ['Todas as matérias marcadas como concluídas foram desmarcadas.', 'All courses marked as completed were unchecked.', 'Todas las asignaturas marcadas como cursadas fueron desmarcadas.'],
    ['Todas as matérias do período foram marcadas automaticamente.', 'All courses of the term were checked automatically.', 'Todas las asignaturas del período fueron marcadas automáticamente.'],
    ['Todas as matérias do período foram desmarcadas automaticamente.', 'All courses of the term were unchecked automatically.', 'Todas las asignaturas del período fueron desmarcadas automáticamente.'],
    ['Marcar todas as condicionadas?', 'Check all conditional courses?', '¿Marcar todas las condicionadas?'],
    ['Todas as disciplinas de Escolha Condicionada serão marcadas como cursadas.', 'All Conditional Elective courses will be marked as completed.', 'Todas las asignaturas de Elección Condicionada se marcarán como cursadas.'],
    ['Isso também marcará, por serem co-requisito: {list}.', 'This will also check, as they are co-requisites: {list}.', 'Esto también marcará, por ser correquisitos: {list}.'],
    ['Marcar todas', 'Check all', 'Marcar todas'],
    ['Marcar também', 'Check too', 'Marcar también'],
    ['{label} copiado com sucesso!', '{label} copied successfully!', '¡{label} copiado con éxito!'],
    ['{label} copiados com sucesso!', '{label} copied successfully!', '¡{label} copiados con éxito!'],
    ['E-mail', 'E-mail', 'Correo'],
    ['Não foi possível copiar. Tente novamente.', 'Could not copy. Please try again.', 'No se pudo copiar. Inténtalo de nuevo.'],
    ['Não foi possível salvar suas alterações neste dispositivo.', 'Could not save your changes on this device.', 'No se pudieron guardar tus cambios en este dispositivo.'],
    ['Selecione ao menos uma disciplina para copiar os códigos.', 'Select at least one course to copy the codes.', 'Selecciona al menos una asignatura para copiar los códigos.'],
    ['A matéria {auto} foi marcada automaticamente por ser co-requisito de {origin}', 'The course {auto} was checked automatically because it is a co-requisite of {origin}', 'La asignatura {auto} fue marcada automáticamente por ser correquisito de {origin}'],
    ['Você desmarcou {a}, mas {b}{extra} continua marcada e depende dela como pré-requisito.', 'You unchecked {a}, but {b}{extra} remains checked and depends on it as a prerequisite.', 'Desmarcaste {a}, pero {b}{extra} sigue marcada y depende de ella como prerrequisito.'],
    ['Você desmarcou {a}, mas {b}{extra} continuam marcadas e dependem dela como pré-requisito.', 'You unchecked {a}, but {b}{extra} remain checked and depend on it as a prerequisite.', 'Desmarcaste {a}, pero {b}{extra} siguen marcadas y dependen de ella como prerrequisito.'],
    [' e mais {n}', ' and {n} more', ' y {n} más'],
    ['{origem} tem {nomes} como co-requisito: devem ser cursadas juntas.', '{origem} has {nomes} as a co-requisite: they must be taken together.', '{origem} tiene a {nomes} como correquisito: deben cursarse juntas.'],
    ['Também falta {nomes}, que ainda não está disponível.', '{nomes} is also missing and is not available yet.', 'También falta {nomes}, que aún no está disponible.'],
    ['{origem} deve ser cursada junto com {nomes}, que ainda não está disponível (confira os pré-requisitos).', '{origem} must be taken together with {nomes}, which is not available yet (check the prerequisites).', '{origem} debe cursarse junto con {nomes}, que aún no está disponible (revisa los prerrequisitos).'],

    // ---- Tutorial ----
    ['Marque o que você já cursou', 'Check what you have already completed', 'Marca lo que ya cursaste'],
    ['Toque na caixinha à direita de cada matéria. As cores mostram a situação: azul é já cursada, verde está disponível para puxar e vermelho está bloqueada por algum pré-requisito.',
      'Tap the box on the right of each course. Colors show the status: blue is completed, green is available to take and red is locked by a prerequisite.',
      'Toca la casilla a la derecha de cada asignatura. Los colores muestran la situación: azul es ya cursada, verde está disponible para cursar y rojo está bloqueada por algún prerrequisito.'],
    ['Veja detalhes e co-requisitos', 'See details and co-requisites', 'Mira detalles y correquisitos'],
    ['Segure o dedo sobre um card (ou toque no ícone de informação) para ver pré-requisitos e co-requisitos. O botão C indica uma matéria que precisa ser cursada junto com outra.',
      'Press and hold a card (or tap the information icon) to see prerequisites and co-requisites. The C button marks a course that must be taken together with another.',
      'Mantén presionada una tarjeta (o toca el ícono de información) para ver prerrequisitos y correquisitos. El botón C indica una asignatura que debe cursarse junto con otra.'],
    ['Planeje o próximo período', 'Plan your next term', 'Planifica el próximo período'],
    ['Na aba "O que puxar?" você escolhe entre as disciplinas disponíveis e acompanha os créditos (o SIGA aceita de {min} a {max}).',
      'In the "What to take?" tab you choose among the available courses and track your credits (SIGA accepts from {min} to {max}).',
      'En la pestaña "¿Qué cursar?" eliges entre las asignaturas disponibles y sigues los créditos (el SIGA acepta de {min} a {max}).'],
    ['Passo {n} de {total}', 'Step {n} of {total}', 'Paso {n} de {total}'],
    ['Pular', 'Skip', 'Omitir'],
    ['Voltar', 'Back', 'Volver'],
    ['Começar', 'Start', 'Empezar'],
    ['Próximo', 'Next', 'Siguiente'],

    // ---- Configurações ----
    ['Personalize o Planejador Acadêmico.', 'Customize the Academic Planner.', 'Personaliza el Planificador Académico.'],
    ['Aparência', 'Appearance', 'Apariencia'],
    ['Tema', 'Theme', 'Tema'],
    ['Escolha o visual do aplicativo.', 'Choose how the app looks.', 'Elige el aspecto de la aplicación.'],
    ['Claro', 'Light', 'Claro'],
    ['Automático', 'Automatic', 'Automático'],
    ['Escuro', 'Dark', 'Oscuro'],
    ['claro', 'light', 'claro'],
    ['escuro', 'dark', 'oscuro'],
    ['Segue o tema do seu aparelho ({mode}).', 'Follows your device theme ({mode}).', 'Sigue el tema de tu dispositivo ({mode}).'],
    ['Sempre claro.', 'Always light.', 'Siempre claro.'],
    ['Sempre escuro.', 'Always dark.', 'Siempre oscuro.'],
    ['Tamanho do texto', 'Text size', 'Tamaño del texto'],
    ['Aumente ou diminua as letras de todo o site.', 'Make the text of the whole site larger or smaller.', 'Aumenta o reduce las letras de todo el sitio.'],
    ['Pequeno', 'Small', 'Pequeño'],
    ['Normal', 'Normal', 'Normal'],
    ['Grande', 'Large', 'Grande'],
    ['Extragrande', 'Extra large', 'Extragrande'],
    ['Avisos', 'Notices', 'Avisos'],
    ['Duração dos avisos', 'Notice duration', 'Duración de los avisos'],
    ['Tempo que os balões de informação ficam na tela.', 'How long information bubbles stay on screen.', 'Tiempo que los globos de información permanecen en pantalla.'],
    ['{n} s', '{n} s', '{n} s'],
    ['Os avisos agora ficam {n} s na tela.', 'Notices now stay on screen for {n} s.', 'Los avisos ahora permanecen {n} s en pantalla.'],
    ['Idioma', 'Language', 'Idioma'],
    ['Escolha o idioma de todo o site.', 'Choose the language of the whole site.', 'Elige el idioma de todo el sitio.'],
    ['Aplicativo', 'App', 'Aplicación'],
    ['Verificar atualização', 'Check for updates', 'Buscar actualización'],
    ['Busca a versão mais nova e recarrega o aplicativo se houver.', 'Looks for the newest version and reloads the app if there is one.', 'Busca la versión más nueva y recarga la aplicación si la hay.'],
    ['Verificando…', 'Checking…', 'Verificando…'],
    ['Nova versão {v} encontrada. Atualizando…', 'New version {v} found. Updating…', 'Nueva versión {v} encontrada. Actualizando…'],
    ['Você já usa a versão mais recente ({v}).', 'You are already on the latest version ({v}).', 'Ya usas la versión más reciente ({v}).'],
    ['Não foi possível verificar agora. Confira sua conexão e tente de novo.', 'Could not check right now. Check your connection and try again.', 'No se pudo verificar ahora. Revisa tu conexión e inténtalo de nuevo.'],
    ['Versão', 'Version', 'Versión'],
    ['Sugestões', 'Suggestions', 'Sugerencias'],
    ['Possui alguma sugestão ou deseja reportar um bug? Por favor mande sua ideia para o e-mail:', 'Do you have a suggestion or want to report a bug? Please send your idea to the e-mail:', '¿Tienes alguna sugerencia o quieres reportar un error? Por favor envía tu idea al correo:'],
    ['Copiar e-mail', 'Copy e-mail', 'Copiar correo']
  ];

  var DICT = { en: Object.create(null), es: Object.create(null) };
  ROWS.forEach(function (r) { DICT.en[r[0]] = r[1]; DICT.es[r[0]] = r[2]; });
  var missing = [];

  function fill(text, params) {
    if (!params) return text;
    return text.replace(/\{(\w+)\}/g, function (m, k) { return Object.prototype.hasOwnProperty.call(params, k) ? params[k] : m; });
  }
  function t(key, params) {
    var text = key;
    if (lang !== 'pt') {
      var hit = DICT[lang][key];
      if (hit === undefined) { if (missing.indexOf(key) < 0) missing.push(key); }
      else text = hit;
    }
    return fill(text, params);
  }

  var collapse = function (s) { return String(s).replace(/\s+/g, ' ').trim(); };
  var originals = new WeakMap();

  function translateTextNode(node) {
    var raw = node.nodeValue;
    if (!raw || !/\S/.test(raw)) return;
    var key = collapse(raw);
    var hit = DICT[lang][key];
    if (hit === undefined) return;
    var lead = raw.match(/^\s*/)[0], trail = raw.match(/\s*$/)[0];
    node.nodeValue = lead + hit + trail;
  }
  var ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
  function translateElement(root) {
    if (lang === 'pt' || !root) return;
    var base = root.nodeType === 1 ? root : (root.parentElement || document.body);
    if (base.closest && base.closest('[data-no-i18n], script, style')) return;
    if (root.nodeType === 3) { translateTextNode(root); return; }
    if (root.nodeType !== 1) return;
    var all = [root].concat(Array.prototype.slice.call(root.querySelectorAll('*')));
    all.forEach(function (el) {
      if (/^(SCRIPT|STYLE)$/.test(el.tagName) || (el.closest && el.closest('[data-no-i18n]'))) return;
      ATTRS.forEach(function (a) {
        if (!el.hasAttribute(a)) return;
        var hit = DICT[lang][collapse(el.getAttribute(a))];
        if (hit !== undefined) el.setAttribute(a, hit);
      });
      if (el.hasAttribute('data-i18n-html')) {
        var key = collapse(el.innerHTML);
        var h = DICT[lang][key];
        if (h !== undefined) el.innerHTML = h;
        return;
      }
      Array.prototype.forEach.call(el.childNodes, function (n) { if (n.nodeType === 3) translateTextNode(n); });
    });
  }

  function apply() {
    document.documentElement.lang = HTML_LANG[lang];
    if (lang === 'pt') return;
    var tt = DICT[lang][collapse(document.title)];
    if (tt) document.title = tt;
    translateElement(document.body);
  }

  window.I18N = {
    get lang() { return lang; },
    supported: SUPPORTED,
    t: t,
    save: function (code) { try { localStorage.setItem(KEY, code); } catch (_) {} },
    apply: apply,
    translate: translateElement,
    get missing() { return missing.slice(); },
    has: function (key) { return lang === 'pt' || DICT[lang][key] !== undefined; },
    _dict: DICT
  };

  apply();
  if (lang !== 'pt' && typeof MutationObserver !== 'undefined') {
    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        Array.prototype.forEach.call(m.addedNodes, function (n) { translateElement(n); });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }
})();
